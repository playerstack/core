/**
 * `playerstack-time-slider` — the progress slider with a hover time tooltip and an optional
 * timelens thumbnail preview (Req 1.4, 1.5, 1.6, 2.1, 3.3, 5.1, 5.3).
 *
 * As an interactive UI_Element it follows the Request/Response model: it NEVER touches the
 * media element directly. A click/pointer release on the track expresses a seek intent via a
 * `playerstack-seek-request` DOM event that the `MediaController` routes to the
 * `PlayerAdapter` (Req 2.1). Playback progress flows back through the shared store; the
 * element mirrors the played fraction into the `part="track-fill"` width and the loaded
 * fraction into `part="track-buffered"` so the Style_Layer only paints the fills (Req 3.3).
 *
 * The hover geometry reuses the SAME pure helpers as the headless layer (Req 1.6):
 * `getTimeFromSliderPosition` (from `@slider`) converts a pointer X into a time, and
 * `computeSpriteFrame` (from `@sprite`) computes the timelens frame geometry — keeping the
 * visual preview consistent with the rest of Core without duplicating math here.
 *
 * Timelens stays intentionally minimal: fetching/parsing the sprite VTT and loading the sheet
 * images is out of scope for Core and lives in the framework adapters (the reactjs migration
 * in task 14.x wires the real data). This element only wires the geometry: when a consumer
 * assigns `spriteData` (parsed cues + sheet sizes) the timelens is enabled and positioned on
 * hover; when it is absent the timelens stays hidden. This keeps the element functional and
 * testable without any network access.
 *
 * Accessibility (Req 1.5): the slider region exposes a configurable accessible name through
 * the `aria-label` attribute; when the consumer omits it, the default English label applies.
 */
import type { TimeSliderDefaultLabel, TimeSliderSpriteData } from '@typings/ui/playerstack-time-slider.types';
import type { ChaptersInput } from '@typings/ui/playerstack-chapters.types';
import type { ChapterInput, ChapterSegment } from '@typings/chapters.types';
import type { SeekRequestDetail } from '@typings/ui/media-controller.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { getTimeFromSliderPosition } from '@slider';
import { computeChapterSegments, getChapterAtTime } from '@chapters';
import { computeSpriteFrame } from '@sprite';
import { formatTime } from '@utils/format';

/** Default accessible name used when no `aria-label` attribute is provided (Req 1.5). */
const DEFAULT_LABEL: TimeSliderDefaultLabel = 'Seek';

export class PlayerstackTimeSlider extends PlayerstackElement {
  /**
   * Declares `aria-label` (accessible name, Req 1.5) and `sprite-vtt-file` (an optional
   * timelens source hint the consuming adapter resolves into `spriteData`) as observed
   * attributes so both are configurable via markup. Keying the schema by readable prop
   * names while mapping to the concrete attributes drives `observedAttributes` from the
   * schema.
   */
  static override attributeSchema = {
    label: { attribute: 'aria-label', type: 'string' },
    spriteVtt: { attribute: 'sprite-vtt-file', type: 'string' },
  } as const;

  /** Latest total duration (seconds) mirrored from the store; drives hover-time + fills. */
  private duration = 0;

  /** Latest seek position (seconds) mirrored from the store; drives the played fill. */
  private seek = 0;

  /** Latest loaded position (seconds) mirrored from the store; drives the buffered fill. */
  private loaded = 0;

  /**
   * Sprite data supplied by the consumer/adapter to enable the timelens preview. `null`
   * keeps the timelens hidden; a value enables geometry computation on hover (Req 1.6).
   */
  private _spriteData: TimeSliderSpriteData | null = null;

  /**
   * Ad-mode flag (default `false`). When `true` the slider becomes the AD progress bar (parity
   * with the original `TimeSlider adMode`): the played fill turns yellow (`#fc0`, driven by the
   * controller-host `[data-ad-active]` Style_Layer hook the skin reflects), the handle/thumb is
   * hidden, the cursor is default, and NO chapter segments render — chapter markers are ignored
   * for as long as the ad plays. Returning to `false` restores chapters + handle + the normal
   * red fill.
   */
  private _adMode = false;

  /** The rendered slider region; kept so `render` stays idempotent across reconnects. */
  private slider: HTMLElement | null = null;

  /** The rendered played-fill element whose width mirrors `seek / duration` (Req 3.3). */
  private trackFill: HTMLElement | null = null;

  /** The rendered buffered-fill element whose width mirrors `loaded / duration` (Req 3.3). */
  private trackBuffered: HTMLElement | null = null;

  /** The rendered handle/thumb; its `left` rides the end of the played fill (Req 3.3). */
  private thumb: HTMLElement | null = null;

  /** The rendered hover-time tooltip (TimeTooltip / StyledTip container). */
  private tooltip: HTMLElement | null = null;

  /** The rendered tooltip time line (StyledTip text) — shows the hovered TIME. */
  private tooltipTime: HTMLElement | null = null;

  /**
   * The rendered tooltip chapter label (StyledChapterLabel) — shows the hovered chapter TITLE
   * when chapters exist. Hidden (empty text) when there is no chapter at the hovered time.
   */
  private tooltipChapter: HTMLElement | null = null;

  /** The rendered timelens thumbnail preview; hidden until `spriteData` is assigned. */
  private timelens: HTMLElement | null = null;

  /**
   * The rendered chapter-segments overlay. Holds the per-chapter divider divs when chapter
   * markers are supplied; empty (and visually inert) otherwise.
   */
  private chaptersOverlay: HTMLElement | null = null;

  /** Raw chapter markers supplied by the consumer/adapter; drive the segment dividers. */
  private markers: ChapterInput[] = [];

  /**
   * Computed chapter segments (via `computeChapterSegments`) reused across store updates so the
   * per-segment fills and the hovered-chapter lookup run against the pre-computed boundaries.
   * Empty when there are no markers / no duration — the plain track then carries the fills.
   */
  private segments: ChapterSegment[] = [];

  /**
   * Per-segment fill element refs, index-aligned with `segments`. Each entry holds the
   * `chapter-segment` block plus its own buffered + played fill divs so `updateFills` can paint
   * each segment's progress per the original ChapterSegments formulas without rebuilding the DOM.
   */
  private segmentEls: Array<{ block: HTMLElement; buffered: HTMLElement; filled: HTMLElement }> = [];

  /**
   * Index of the chapter segment currently under the pointer, or `-1` when none. Mirrors the
   * original `hoveredIndex` so the hovered block scales up (`scaleY`) via the Style_Layer.
   */
  private hoveredIndex = -1;

  /**
   * `true` while the user is actively scrubbing (pointer pressed on the slider). During a
   * drag the played fill + thumb follow the pointer OPTIMISTICALLY and the store's playback
   * position is ignored, matching the original `timeSliderSliding` behavior.
   */
  private dragging = false;

  /**
   * Optimistic seek time (seconds) while dragging. Mirrors the original `timeSliderState.value`
   * so the fill/thumb/tooltip track the pointer before the release commits the seek.
   */
  private dragTime = 0;

  /**
   * Public setter/property to enable the timelens preview. Assigning parsed cues + sheet
   * sizes turns the timelens on; assigning `null` hides it again. The actual VTT fetch and
   * image loading stay with the consumer/adapter (Req 1.6) — this element only wires the
   * geometry when data is provided.
   */
  set spriteData(data: TimeSliderSpriteData | null) {
    this._spriteData = data;
    // Hide the timelens immediately when data is removed; hovering re-shows it when present.
    if (data === null && this.timelens !== null) {
      this.timelens.style.display = 'none';
    }
  }

  get spriteData(): TimeSliderSpriteData | null {
    return this._spriteData;
  }

  /**
   * Public setter/property to supply the raw chapter markers rendered as segment dividers on
   * the timeline (Req 1.6, 3.3). Assigning markers rebuilds the `part="chapters"` overlay via
   * the shared `computeChapterSegments` against the current duration so the timeline is split
   * into chapters exactly like the original `ChapterSegments`. Assigning `null`/empty clears it.
   */
  set chapters(input: ChaptersInput | null) {
    this.markers = input ?? [];
    this.renderChapterSegments();
  }

  get chapters(): ChaptersInput | null {
    return this.markers;
  }

  /**
   * Public setter for the ad-mode flag (default `false`). Toggling it repaints the slider as the
   * ad progress bar or restores the normal timeline: it hides/shows the thumb + sets the cursor,
   * and rebuilds the chapter overlay (which becomes a no-op / hidden while `adMode` is true so no
   * chapter segments show during an ad). Coerced to a boolean for predictable prop assignment.
   */
  set adMode(value: boolean) {
    const next = Boolean(value);
    if (next === this._adMode) {
      return;
    }
    this._adMode = next;
    this.applyAdMode();
    // Rebuild the chapter overlay so segments disappear in ad mode (and reappear when it ends),
    // then repaint the fills so the plain (yellow) track carries the ad progress.
    this.renderChapterSegments();
    this.updateFills();
  }

  get adMode(): boolean {
    return this._adMode;
  }

  /**
   * Applies the ad-mode visual gating that the element owns directly (independent of the
   * controller-host CSS hook): hides the handle/thumb and sets the slider cursor to `default`
   * while an ad plays, restoring both when the ad ends. The yellow played fill is driven by the
   * Style_Layer via the controller host `[data-ad-active]`, so it is not set here.
   */
  private applyAdMode(): void {
    if (this.thumb !== null) {
      this.thumb.style.display = this._adMode ? 'none' : '';
    }
    if (this.slider !== null) {
      this.slider.style.cursor = this._adMode ? 'default' : '';
    }
  }

  /**
   * Tracks the progress fields this element cares about and repaints the played + buffered
   * fills. Only the subset needed is read, per the base class's opt-in `onStoreChange`
   * design; no host `data-*` toggling is required for the slider itself.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    // Chapter segment boundaries depend on the total duration, so rebuild the dividers when it
    // changes (mirrors the original ChapterSegments recomputing off `duration`).
    const durationChanged = state.duration !== this.duration;
    this.duration = state.duration;
    this.seek = state.seek;
    this.loaded = state.loaded;
    if (durationChanged) {
      this.renderChapterSegments();
    }
    this.updateFills();
  }

  /**
   * Sets the played + buffered fill widths and positions the thumb (Req 1.6, 3.3). The played
   * fraction is `seek / duration` and the buffered fraction is `loaded / duration`, both
   * guarded so a zero/unknown duration yields `0%` instead of a division by zero. WHILE the
   * user is scrubbing the played fill + thumb follow the OPTIMISTIC `dragTime` instead of the
   * store's `seek`, matching the original `timeSliderSliding` behavior; the buffered fill keeps
   * tracking the real loaded position. The thumb rides the RIGHT EDGE of the played fill (the
   * original pinned the handle to the end of the red progress track), so its `left` mirrors the
   * played fraction.
   */
  private updateFills(): void {
    const playedTime = this.dragging ? this.dragTime : this.seek;
    const playedFraction = this.clampFraction(this.duration > 0 ? playedTime / this.duration : 0);
    const bufferedFraction = this.clampFraction(this.duration > 0 ? this.loaded / this.duration : 0);
    const hasChapters = this.segments.length > 0 && this.duration > 0;

    // When chapters exist the per-segment fills carry the progress, so the plain track-fill /
    // buffered must NOT double-paint (the original hid them by rendering the segments in place
    // of the plain rail). Set their widths to 0 so only the segments show progress.
    if (this.trackFill !== null) {
      this.trackFill.style.width = hasChapters ? '0%' : `${playedFraction * 100}%`;
    }
    if (this.trackBuffered !== null) {
      this.trackBuffered.style.width = hasChapters ? '0%' : `${bufferedFraction * 100}%`;
    }
    // Position the handle at the played fraction so it rides the end of the played fill.
    if (this.thumb !== null) {
      this.thumb.style.left = `${playedFraction * 100}%`;
    }

    if (hasChapters) {
      this.updateSegmentFills(playedTime);
    }
  }

  /**
   * Paints each chapter segment's OWN buffered + played fill per the original ChapterSegments
   * formulas (Req 1.6, 3.3): for a segment spanning `[start, end]` of duration `segDur`, the
   * played fill is 100% when `time >= end`, `((time - start) / segDur) * 100` when
   * `time > start`, else 0; the buffered fill applies the same formula against
   * `loaded` (the buffered time). Runs over the pre-built `segmentEls` refs so no DOM is rebuilt.
   */
  private updateSegmentFills(playedTime: number): void {
    const bufferedTime = this.loaded;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]!;
      const refs = this.segmentEls[i];
      if (refs === undefined) {
        continue;
      }
      const segDur = segment.endTime - segment.startTime;
      refs.filled.style.width = `${this.segmentFillPercent(playedTime, segment.startTime, segment.endTime, segDur)}%`;
      refs.buffered.style.width = `${this.segmentFillPercent(bufferedTime, segment.startTime, segment.endTime, segDur)}%`;
    }
  }

  /**
   * Computes a per-segment fill percentage for a given time against a segment `[start, end]`
   * (original ChapterSegments logic): 100 past the end, a linear share inside the segment, 0
   * before the start. Guards a zero-length segment to 0 to avoid a division by zero.
   */
  private segmentFillPercent(time: number, start: number, end: number, segDur: number): number {
    if (segDur <= 0) return 0;
    if (time >= end) return 100;
    if (time > start) return ((time - start) / segDur) * 100;
    return 0;
  }

  /**
   * Rebuilds the `part="chapters"` overlay: one `part="chapter-segment"` divider per computed
   * segment, its width the segment's share of the duration, laid out with gaps so the timeline
   * reads as discrete chapters (ported from the original `ChapterSegments`). The dividers are
   * purely visual (pointer-events disabled by the Style_Layer) so the slider stays seekable
   * through them. Segments are derived with the SAME shared `computeChapterSegments` the
   * headless layer and `playerstack-chapters` use (Req 1.6). Guards for the pre-render window.
   */
  private renderChapterSegments(): void {
    if (this.chaptersOverlay === null) {
      return;
    }
    // In ad mode the slider IS the ad progress bar: chapter markers are ignored entirely and no
    // segments render (parity with the original, which rendered the plain `adMode` track and no
    // ChapterSegments during an ad). Clear any prior segments + refs and hide the overlay.
    this.segments = this._adMode ? [] : computeChapterSegments(this.markers, this.duration);
    // Clear any previous dividers + refs before repainting.
    this.chaptersOverlay.textContent = '';
    this.segmentEls = [];
    this.hoveredIndex = -1;
    if (this.segments.length === 0 || this.duration <= 0) {
      this.chaptersOverlay.style.display = 'none';
      // No chapters: restore the plain rail/track as the timeline.
      this.removeAttribute('data-has-chapters');
      return;
    }
    this.chaptersOverlay.style.display = 'flex';
    // When chapters render, the segments ARE the timeline (the original hid the plain rail/track
    // entirely in the `hasChapters` branch). Flag the host so the Style_Layer hides the plain
    // `[part='track']` base, avoiding a translucent double-layer under the segments that made the
    // hovered segment look brighter/solid.
    this.setAttribute('data-has-chapters', 'true');
    for (const segment of this.segments) {
      const widthPercent = ((segment.endTime - segment.startTime) / this.duration) * 100;
      // Each block owns its buffered + played fill so it paints its OWN progress (parity with
      // the original StyledChapterSegment > Buffered + Filled).
      const block = document.createElement('div');
      block.setAttribute('part', 'chapter-segment');
      block.style.width = `${widthPercent}%`;
      block.title = segment.title;

      const buffered = document.createElement('div');
      buffered.setAttribute('part', 'chapter-segment-buffered');

      const filled = document.createElement('div');
      filled.setAttribute('part', 'chapter-segment-filled');

      // Buffered sits behind the played fill (appended first).
      block.appendChild(buffered);
      block.appendChild(filled);
      this.chaptersOverlay.appendChild(block);
      this.segmentEls.push({ block, buffered, filled });
    }
    // Paint the initial per-segment fills from the current progress.
    this.updateFills();
  }

  /**
   * Marks the chapter segment under the hovered time with `data-hovered` so the Style_Layer
   * scales it up (`scaleY(2)` desktop / `scaleY(1.8)` fullscreen), matching the original
   * `hoveredIndex`. Resolves the index via the pre-computed segments (start-inclusive), clears
   * the previous marker and sets the new one; a no-op when there are no segments.
   */
  private updateHoveredSegment(time: number): void {
    if (this.segmentEls.length === 0) {
      return;
    }
    const chapter = getChapterAtTime(this.segments, time);
    const index = chapter === null ? -1 : this.segments.findIndex((s) => s.startTime === chapter.startTime);
    if (index === this.hoveredIndex) {
      return;
    }
    if (this.hoveredIndex >= 0) {
      this.segmentEls[this.hoveredIndex]?.block.removeAttribute('data-hovered');
    }
    if (index >= 0) {
      this.segmentEls[index]?.block.setAttribute('data-hovered', 'true');
    }
    this.hoveredIndex = index;
  }

  /** Clears any hovered-segment marker (pointer left the slider), resetting `hoveredIndex`. */
  private clearHoveredSegment(): void {
    if (this.hoveredIndex >= 0) {
      this.segmentEls[this.hoveredIndex]?.block.removeAttribute('data-hovered');
    }
    this.hoveredIndex = -1;
  }

  /** Clamps a fraction into `[0, 1]` so out-of-range store values never overflow the track. */
  private clampFraction(fraction: number): number {
    if (fraction < 0) return 0;
    if (fraction > 1) return 1;
    return fraction;
  }

  /**
   * Reflects the local `data-time-sliding` flag on the element host while the user scrubs
   * (Req 3.3). The original threaded a `timeSliding`/`isSliding` boolean into the slider so the
   * rail stayed thick, the handle popped and the tooltip stayed visible during a drag. The
   * controller already mirrors `data-time-sliding` from the store's `seeking`, but a local drag
   * has no store round-trip, so the element drives its OWN host attribute and the Style_Layer
   * keys off `playerstack-time-slider[data-time-sliding]` too. Kept agnostic: a plain host
   * attribute toggle, no adapter/store coupling.
   */
  private setSliding(sliding: boolean): void {
    if (sliding) {
      this.setAttribute('data-time-sliding', 'true');
    } else {
      this.removeAttribute('data-time-sliding');
    }
  }

  /**
   * Builds the Markup_Contract: a `part="time-slider"` container wrapping a `part="slider"`
   * region with `track` (holding `track-buffered` and `track-fill`) and `thumb`, plus a
   * `part="tooltip"` (TimeTooltip) and a `part="timelens"` thumbnail preview. Nodes are
   * created and APPENDED (never via `innerHTML`) so the adopted Style_Layer — in the fallback
   * path an injected `<style>` — is preserved. A guard keeps `render` idempotent across
   * reconnects.
   */
  protected render(): void {
    if (this.slider !== null) {
      return;
    }

    // Outer container: the state hook / positioning context for tooltip + timelens.
    const container = document.createElement('div');
    container.setAttribute('part', 'time-slider');

    const slider = document.createElement('div');
    slider.setAttribute('part', 'slider');
    // The slider region carries the configurable accessible name (Req 1.5).
    slider.setAttribute('aria-label', this.getAttribute('aria-label') ?? DEFAULT_LABEL);

    const track = document.createElement('div');
    track.setAttribute('part', 'track');

    // Buffered fill sits behind the played fill: appended first so the played fill paints
    // over it in normal document order (Req 3.3).
    const trackBuffered = document.createElement('div');
    trackBuffered.setAttribute('part', 'track-buffered');

    const trackFill = document.createElement('div');
    trackFill.setAttribute('part', 'track-fill');

    // Chapter-segment dividers overlay the track and split the timeline into chapters
    // (ported from the original ChapterSegments). Empty + hidden until `chapters` is assigned.
    const chaptersOverlay = document.createElement('div');
    chaptersOverlay.setAttribute('part', 'chapters');
    chaptersOverlay.style.display = 'none';

    const thumb = document.createElement('div');
    thumb.setAttribute('part', 'thumb');

    track.appendChild(trackBuffered);
    track.appendChild(trackFill);
    slider.appendChild(track);
    // Chapter segments overlay the slider as a SIBLING of the track (NOT a child of it): the
    // track applies a `scaleY(0.6)` rest transform that would shrink the segments and cap their
    // hover-grow. The original ChapterSegmentsContainer was a sibling of the rail for the same
    // reason, so the hovered segment can grow to its full `scaleY(2)` height independently.
    slider.appendChild(chaptersOverlay);
    slider.appendChild(thumb);

    // Hover-time tooltip (StyledTooltip > StyledTip): a centered column that shows the hovered
    // TIME and, when chapters exist, the hovered chapter TITLE above it (StyledChapterLabel).
    // The timelens starts hidden until `spriteData` is provided and a hover computes a frame.
    const tooltip = document.createElement('div');
    tooltip.setAttribute('part', 'tooltip');

    // Chapter label renders ABOVE the time (matching the original StyledTip child order:
    // {chapterTitle && <StyledChapterLabel/>}{displayTime}). Empty + hidden until a hovered
    // chapter is resolved.
    const tooltipChapter = document.createElement('div');
    tooltipChapter.setAttribute('part', 'tooltip-chapter');
    tooltipChapter.style.display = 'none';

    const tooltipTime = document.createElement('div');
    tooltipTime.setAttribute('part', 'tooltip-time');

    tooltip.appendChild(tooltipChapter);
    tooltip.appendChild(tooltipTime);

    const timelens = document.createElement('div');
    timelens.setAttribute('part', 'timelens');
    timelens.style.display = 'none';

    container.appendChild(slider);
    container.appendChild(tooltip);
    container.appendChild(timelens);

    // Pointer move over the slider positions the tooltip (and timelens when data is present)
    // at the hovered time computed with the SAME pure geometry as the headless layer (Req 1.6).
    // WHILE dragging (press-and-scrub), the move ALSO drives the optimistic played fill + thumb
    // to the pointer position, mirroring the original `onMouseMove` → `onChange(value)` loop.
    const onPointerMove = (event: PointerEvent): void => {
      // Ad mode: the timeline is a NON-interactive progress bar (the original disabled the
      // slider handle + cursor and never called `onChange` in `adMode`). No hover tooltip,
      // no chapter hover, no scrub — the ad position cannot be changed.
      if (this._adMode) {
        return;
      }
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const time = getTimeFromSliderPosition(event.clientX, rect, this.duration);
      this.positionHover(event.clientX, rect, time);
      this.updateHoveredSegment(time);
      if (this.dragging) {
        this.dragTime = time;
        this.updateFills();
      }
    };
    slider.addEventListener('pointermove', onPointerMove);
    this.addDisposer(() => slider.removeEventListener('pointermove', onPointerMove));

    // Hide the hover affordances when the pointer leaves the slider — unless a drag is in
    // progress (the original kept the tooltip/handle visible while scrubbing off the track).
    const onPointerLeave = (): void => {
      if (this.dragging) {
        return;
      }
      tooltip.style.display = 'none';
      timelens.style.display = 'none';
      this.clearHoveredSegment();
    };
    slider.addEventListener('pointerleave', onPointerLeave);
    this.addDisposer(() => slider.removeEventListener('pointerleave', onPointerLeave));

    // Press-and-drag scrubbing (ported from `useTimeSlider.onMouseDown`): a pointer press
    // starts a drag, seeds the optimistic time from the press position, reflects
    // `data-time-sliding` on the host so the Style_Layer keeps the rail thick / handle popped /
    // tooltip visible while scrubbing, and captures the pointer so moves keep arriving even if
    // the pointer leaves the slider. NO request is emitted yet — the release commits the seek.
    const onPointerDown = (event: PointerEvent): void => {
      // Ad mode: seeking/scrubbing is disabled (parity with the original `adMode` slider), so a
      // press starts NO drag and emits NO seek — the ad cannot be fast-forwarded/rewound.
      if (this._adMode) {
        return;
      }
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      this.dragging = true;
      this.dragTime = getTimeFromSliderPosition(event.clientX, rect, this.duration);
      this.setSliding(true);
      // Capture the pointer (when supported) so the drag tracks past the slider bounds.
      if (typeof slider.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
        try {
          slider.setPointerCapture(event.pointerId);
        } catch {
          // Ignore: capture is a best-effort enhancement (jsdom lacks it).
        }
      }
      this.positionHover(event.clientX, rect, this.dragTime);
      this.updateFills();
    };
    slider.addEventListener('pointerdown', onPointerDown);
    this.addDisposer(() => slider.removeEventListener('pointerdown', onPointerDown));

    // A pointer release commits the seek intent to the final pointer time (Req 2.1), reusing the
    // same pure geometry so the emitted time matches the tooltip/fill preview (Req 1.6). On a
    // plain click (no preceding drag) it seeks to the clicked time exactly as before; after a
    // drag it seeks to the release position and clears the sliding state.
    const onPointerUp = (event: PointerEvent): void => {
      // Ad mode: no click-to-seek — the ad position is fixed (parity with the original).
      if (this._adMode) {
        return;
      }
      const wasDragging = this.dragging;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        if (wasDragging) {
          this.dragging = false;
          this.setSliding(false);
          this.updateFills();
        }
        return;
      }
      const time = getTimeFromSliderPosition(event.clientX, rect, this.duration);
      if (wasDragging) {
        this.dragging = false;
        this.setSliding(false);
        // Snap the optimistic fill to the release position until the store confirms the seek.
        this.dragTime = time;
      }
      this.dispatchRequest<SeekRequestDetail>('playerstack-seek-request', { time });
      this.updateFills();
    };
    slider.addEventListener('pointerup', onPointerUp);
    this.addDisposer(() => slider.removeEventListener('pointerup', onPointerUp));
    // On disconnect, make sure any in-flight drag flag is cleared.
    this.addDisposer(() => {
      this.dragging = false;
    });

    this.slider = slider;
    this.trackFill = trackFill;
    this.trackBuffered = trackBuffered;
    this.thumb = thumb;
    this.chaptersOverlay = chaptersOverlay;
    this.tooltip = tooltip;
    this.tooltipTime = tooltipTime;
    this.tooltipChapter = tooltipChapter;
    this.timelens = timelens;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Seed duration/seek/loaded from any state the store already holds so the first paint uses
    // real progress (the context may resolve before render runs).
    const state = this.store?.getState();
    if (state !== undefined) {
      this.duration = state.duration;
      this.seek = state.seek;
      this.loaded = state.loaded;
    }

    // Apply any ad-mode gating set before connect (hide handle / default cursor), then paint the
    // initial fills + thumb and any chapter segments assigned before connect (a no-op in ad mode).
    this.applyAdMode();
    this.updateFills();
    this.renderChapterSegments();
  }

  /**
   * Positions the hover tooltip at the pointer X and, when `spriteData` is present, computes
   * and applies the timelens frame geometry via `computeSpriteFrame` (Req 1.6). The tooltip
   * text uses the shared `formatTime` so it matches the rest of Core. Left as a small helper
   * so the pointer-move handler stays focused on reading the event.
   */
  private positionHover(clientX: number, rect: { left: number; width: number }, time: number): void {
    if (this.tooltip !== null) {
      const offsetX = clientX - rect.left;
      // StyledTooltip toggles display:block and is positioned at the pointer X; the inner
      // StyledTip centers on that point via translateX(-50%) in the Style_Layer.
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${offsetX}px`;
      if (this.tooltipTime !== null) {
        this.tooltipTime.textContent = formatTime(time);
      }
      // When chapters exist, surface the hovered chapter's TITLE above the time
      // (StyledChapterLabel), resolved with the SAME shared helper the headless layer uses.
      if (this.tooltipChapter !== null) {
        const chapter = this.segments.length > 0 ? getChapterAtTime(this.segments, time) : null;
        if (chapter !== null) {
          this.tooltipChapter.textContent = chapter.title;
          this.tooltipChapter.style.display = 'block';
        } else {
          this.tooltipChapter.textContent = '';
          this.tooltipChapter.style.display = 'none';
        }
      }
    }

    // Timelens is wired only when the consumer/adapter provided parsed sprite data (Req 1.6).
    if (this.timelens === null || this._spriteData === null) {
      return;
    }
    const containerSize = { width: this.timelens.offsetWidth, height: this.timelens.offsetHeight };
    const frame = computeSpriteFrame(this._spriteData.cues, time, containerSize, this._spriteData.sheetSizes);
    if (frame === null) {
      this.timelens.style.display = 'none';
      return;
    }
    const offsetX = clientX - rect.left;
    this.timelens.style.display = 'block';
    this.timelens.style.left = `${offsetX}px`;
    this.timelens.style.backgroundImage = `url(${frame.file})`;
    this.timelens.style.backgroundSize = `${frame.bgW}px ${frame.bgH}px`;
    this.timelens.style.backgroundPosition = `${frame.bgPosX}px ${frame.bgPosY}px`;
  }
}
