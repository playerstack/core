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
import type { SeekRequestDetail } from '@typings/ui/media-controller.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { getTimeFromSliderPosition } from '@slider';
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

  /** The rendered slider region; kept so `render` stays idempotent across reconnects. */
  private slider: HTMLElement | null = null;

  /** The rendered played-fill element whose width mirrors `seek / duration` (Req 3.3). */
  private trackFill: HTMLElement | null = null;

  /** The rendered buffered-fill element whose width mirrors `loaded / duration` (Req 3.3). */
  private trackBuffered: HTMLElement | null = null;

  /** The rendered hover-time tooltip (TimeTooltip). */
  private tooltip: HTMLElement | null = null;

  /** The rendered timelens thumbnail preview; hidden until `spriteData` is assigned. */
  private timelens: HTMLElement | null = null;

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
   * Tracks the progress fields this element cares about and repaints the played + buffered
   * fills. Only the subset needed is read, per the base class's opt-in `onStoreChange`
   * design; no host `data-*` toggling is required for the slider itself.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.duration = state.duration;
    this.seek = state.seek;
    this.loaded = state.loaded;
    this.updateFills();
  }

  /**
   * Sets the played and buffered fill widths as percentages of the duration (Req 1.6, 3.3).
   * The played fraction is `seek / duration` and the buffered fraction is `loaded / duration`,
   * both guarded so a zero/unknown duration yields `0%` instead of a division by zero.
   */
  private updateFills(): void {
    const playedFraction = this.duration > 0 ? this.seek / this.duration : 0;
    const bufferedFraction = this.duration > 0 ? this.loaded / this.duration : 0;
    if (this.trackFill !== null) {
      this.trackFill.style.width = `${this.clampFraction(playedFraction) * 100}%`;
    }
    if (this.trackBuffered !== null) {
      this.trackBuffered.style.width = `${this.clampFraction(bufferedFraction) * 100}%`;
    }
  }

  /** Clamps a fraction into `[0, 1]` so out-of-range store values never overflow the track. */
  private clampFraction(fraction: number): number {
    if (fraction < 0) return 0;
    if (fraction > 1) return 1;
    return fraction;
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

    const thumb = document.createElement('div');
    thumb.setAttribute('part', 'thumb');

    track.appendChild(trackBuffered);
    track.appendChild(trackFill);
    slider.appendChild(track);
    slider.appendChild(thumb);

    // Hover-time tooltip and timelens preview. The timelens starts hidden until `spriteData`
    // is provided and a hover computes a frame.
    const tooltip = document.createElement('div');
    tooltip.setAttribute('part', 'tooltip');

    const timelens = document.createElement('div');
    timelens.setAttribute('part', 'timelens');
    timelens.style.display = 'none';

    container.appendChild(slider);
    container.appendChild(tooltip);
    container.appendChild(timelens);

    // Pointer move over the slider positions the tooltip (and timelens when data is present)
    // at the hovered time computed with the SAME pure geometry as the headless layer (Req 1.6).
    const onPointerMove = (event: PointerEvent): void => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const time = getTimeFromSliderPosition(event.clientX, rect, this.duration);
      this.positionHover(event.clientX, rect, time);
    };
    slider.addEventListener('pointermove', onPointerMove);
    this.addDisposer(() => slider.removeEventListener('pointermove', onPointerMove));

    // Hide the hover affordances when the pointer leaves the slider.
    const onPointerLeave = (): void => {
      tooltip.style.display = 'none';
      timelens.style.display = 'none';
    };
    slider.addEventListener('pointerleave', onPointerLeave);
    this.addDisposer(() => slider.removeEventListener('pointerleave', onPointerLeave));

    // A pointer release on the slider expresses a seek intent to the hovered time (Req 2.1),
    // reusing the same pure geometry so the emitted time matches the tooltip preview (Req 1.6).
    const onPointerUp = (event: PointerEvent): void => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const time = getTimeFromSliderPosition(event.clientX, rect, this.duration);
      this.dispatchRequest<SeekRequestDetail>('playerstack-seek-request', { time });
    };
    slider.addEventListener('pointerup', onPointerUp);
    this.addDisposer(() => slider.removeEventListener('pointerup', onPointerUp));

    this.slider = slider;
    this.trackFill = trackFill;
    this.trackBuffered = trackBuffered;
    this.tooltip = tooltip;
    this.timelens = timelens;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Paint the initial fills from whatever progress the store has already delivered (if any).
    this.updateFills();
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
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${offsetX}px`;
      this.tooltip.textContent = formatTime(time);
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
