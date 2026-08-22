/**
 * `playerstack-volume` — the mute toggle plus volume slider control (Req 1.4, 1.5, 1.6, 2.1,
 * 3.3, 5.1, 5.3).
 *
 * As an interactive UI_Element it follows the Request/Response model: it NEVER touches the
 * media element or a VolumeController directly. Interactions only express intent via bubbling
 * + composed request events that the `MediaController` routes to the `PlayerAdapter`
 * (Req 2.1); the controller side (VolumeController wiring) lives in the MediaController /
 * adapter layer, not here. Volume/mute state flows back through the shared store; the element
 * reflects `data-muted` on its host so the Style_Layer can swap the volume/muted glyph and dim
 * the slider fill through its `[part='mute-button'][data-muted] .icon-volume` and
 * `[part='volume'][data-muted] [part='track-fill']` selectors (Req 3.3).
 *
 * The slider fill uses the SAME pure geometry as the headless layer: `getVolumePercentage`
 * (from `@slider`) converts between a pointer offset and a 0..100 percentage, so the visual
 * fill and the emitted volume intent stay consistent with the rest of Core (Req 1.6).
 *
 * Accessibility (Req 1.5): the rendered `<button>` carries the implicit ARIA `button` role,
 * and its accessible name is configurable through the `aria-label` attribute. When the
 * consumer omits it, the default English label applies.
 */
import type { VolumeDefaultLabel } from '@typings/ui/playerstack-volume.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { getVolumePercentage } from '@slider';
import { renderSvgFromDescriptor } from '@ui/icon-render';
import { unmutedIcon, mutedIcon } from '@icons/index';

/** Default accessible name used when no `aria-label` attribute is provided (Req 1.5). */
const DEFAULT_LABEL: VolumeDefaultLabel = 'Mute';

export class PlayerstackVolume extends PlayerstackElement {
  /**
   * Declares `aria-label` as an observed attribute so the mute button's accessible name is
   * configurable via markup (Req 1.5). Keying the schema by `label` while mapping to the
   * `aria-label` attribute keeps the prop name readable and drives `observedAttributes`.
   */
  static override attributeSchema = {
    label: { attribute: 'aria-label', type: 'string' },
  } as const;

  /**
   * Latest `isMuted` value mirrored from the store. The mute button's click handler reads it
   * to decide whether the interaction expresses a mute or an unmute intent (Req 2.1) without
   * querying the media element.
   */
  private muted = false;

  /**
   * Latest `volume` value (0..1) mirrored from the store. Tracked so the slider fill can be
   * updated on every store change without re-reading the DOM.
   */
  private volume = 0;

  /** The rendered mute button; kept so `render` stays idempotent across reconnects. */
  private muteButton: HTMLButtonElement | null = null;

  /** The rendered `track-fill` element whose width mirrors the current volume (Req 3.3). */
  private trackFill: HTMLElement | null = null;

  /** The rendered thumb; its `left` mirrors the current volume percentage (Req 3.3). */
  private thumb: HTMLElement | null = null;

  /** The floating percentage read-out shown while hovering/dragging the slider. */
  private tooltip: HTMLElement | null = null;

  /** `true` while the user is dragging the volume slider (pointer pressed on the track). */
  private dragging = false;

  /** `true` while the pointer hovers the slider (drives the percentage tooltip, like original). */
  private sliderHovering = false;

  /**
   * Reflects the latest `isMuted` state to `data-muted` on the host (Req 3.3), tracks the
   * mute/volume values for the handlers, and updates the slider fill width from `volume`.
   * Only the fields this element cares about are reflected, per the base class's opt-in
   * `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.muted = state.isMuted;
    this.volume = state.volume;
    this.reflectState({ muted: state.isMuted });
    this.updateFill();
    // Keep the percentage read-out in sync when it is visible (e.g. muted toggled while hovering).
    this.refreshTooltip();
  }

  /**
   * Sets the `track-fill` width to the EFFECTIVE volume as a percentage (Req 1.6, 3.3). When
   * muted the effective volume is 0 so the slider empties to the left — matching the original
   * `effectiveVolume = isMuted ? 0 : volume` (the muted class only DIMMED the fill; the fill
   * width still dropped to 0). `getVolumePercentage` clamps to `0..100` so out-of-bounds store
   * values never produce an invalid width.
   */
  private updateFill(): void {
    const effectiveVolume = this.muted ? 0 : this.volume;
    // Feed volume*100 as the "offset" against a width of 100 so the pure helper yields the
    // clamped percentage directly, keeping the fill math identical to the headless layer.
    const percentage = getVolumePercentage(effectiveVolume * 100, 100);
    if (this.trackFill !== null) {
      this.trackFill.style.width = `${percentage}%`;
    }
    // Position the thumb at the current volume so it rides the end of the fill (the original
    // VolumeSlider positioned its thumb by the same volume percentage). Percent-based `left`
    // keeps the geometry framework-agnostic without measuring the track width.
    if (this.thumb !== null) {
      // Position the thumb CENTER inside the track inset by its radius (7px) at both ends, so
      // the 14px circle never overflows the `[part='volume']` box (which is `overflow:hidden`
      // for the width 0->N reveal and would otherwise clip the ball at 0%/100%). The thumb's
      // own `transform: translate(-50%,-50%)` centers the circle on this point. `--ps-thumb-r`
      // (radius) is defined in the Style_Layer so fullscreen (9px) reuses the same math.
      this.thumb.style.left = `${percentage}%`;
    }
  }

  /**
   * Shows/updates the percentage read-out (`StyledVolumePercentTooltip`) while the slider is
   * hovered OR being dragged (original `showTooltip = sliderHovering || volumeSliding`). The
   * text is the rounded EFFECTIVE volume (`Math.round(effectiveVolume * 100)%`, so muted reads
   * `0%`), positioned above the thumb at the current percentage. Hidden otherwise. `forceMuted`
   * (a disabled slider) is not modeled in Core, so the original `&& !forceMuted` guard maps to
   * "always allowed here".
   */
  private refreshTooltip(): void {
    if (this.tooltip === null) {
      return;
    }
    const visible = this.sliderHovering || this.dragging;
    if (!visible) {
      this.tooltip.setAttribute('data-visible', 'false');
      return;
    }
    const effectiveVolume = this.muted ? 0 : this.volume;
    const percentage = getVolumePercentage(effectiveVolume * 100, 100);
    this.tooltip.textContent = `${Math.round(percentage)}%`;
    // Anchor the tooltip over the thumb: same percentage along the track. The CSS centers it
    // with translateX(-50%) so `left:{pct}%` puts it above the current fill end.
    this.tooltip.style.left = `${percentage}%`;
    this.tooltip.setAttribute('data-visible', 'true');
  }

  /**
   * Builds the Markup_Contract: a `part="mute-button"` `<button>` holding the volume and
   * muted glyph spans the Style_Layer toggles by reflected state, plus a `part="volume"`
   * region containing a `part="slider"` with `track`, `track-fill` and `thumb`. Nodes are
   * created and APPENDED (never via `innerHTML`) so the Style_Layer the base class adopted
   * before `render` — in the fallback path an injected `<style>` — is preserved. A guard keeps
   * `render` idempotent across reconnects.
   */
  protected render(): void {
    if (this.muteButton !== null) {
      return;
    }

    const muteButton = document.createElement('button');
    muteButton.setAttribute('part', 'mute-button');
    muteButton.setAttribute('type', 'button');
    // The accessible name comes from the host's `aria-label` when set, else the default
    // (Req 1.5). `<button>` already carries the implicit ARIA `button` role.
    muteButton.setAttribute('aria-label', this.getAttribute('aria-label') ?? DEFAULT_LABEL);

    // Volume/muted glyphs: class names match the Style_Layer selectors that hide the inactive
    // glyph based on the reflected `data-muted` state (Req 3.3).
    const iconVolume = document.createElement('span');
    iconVolume.className = 'icon icon-volume';
    // Inject the real SVG glyph into each span's OWN innerHTML (safe: the serializer escapes
    // attribute values). The spans belong to this element, not the shadow root, so the adopted
    // Style_Layer survives. The `icon-*` classes are kept so the mute-state toggle still swaps
    // them. `unmutedIcon` is the "has volume" glyph; `mutedIcon` the muted one.
    iconVolume.innerHTML = renderSvgFromDescriptor(unmutedIcon);
    const iconMuted = document.createElement('span');
    iconMuted.className = 'icon icon-muted';
    iconMuted.innerHTML = renderSvgFromDescriptor(mutedIcon);
    muteButton.appendChild(iconVolume);
    muteButton.appendChild(iconMuted);

    // Mute button click emits mute/unmute intent based on the current `muted` state (Req 2.1).
    const onMuteClick = (): void => {
      if (this.muted) {
        this.dispatchRequest('playerstack-unmute-request');
      } else {
        this.dispatchRequest('playerstack-mute-request');
      }
    };
    muteButton.addEventListener('click', onMuteClick);
    // Deterministic cleanup: drop the listener on disconnect (paired with the base class).
    this.addDisposer(() => muteButton.removeEventListener('click', onMuteClick));

    // Volume slider region. `part="volume"` is the state hook the Style_Layer dims when muted;
    // the inner `part="slider"` reuses the shared slider primitives (track/fill/thumb).
    const volume = document.createElement('div');
    volume.setAttribute('part', 'volume');

    const slider = document.createElement('div');
    slider.setAttribute('part', 'slider');

    const track = document.createElement('div');
    track.setAttribute('part', 'track');

    const trackFill = document.createElement('div');
    trackFill.setAttribute('part', 'track-fill');

    const thumb = document.createElement('div');
    thumb.setAttribute('part', 'thumb');

    // Percentage read-out shown while hovering/dragging the slider (StyledVolumePercentTooltip).
    const tooltip = document.createElement('div');
    tooltip.setAttribute('part', 'volume-tooltip');
    tooltip.setAttribute('data-visible', 'false');

    track.appendChild(trackFill);
    slider.appendChild(track);
    slider.appendChild(thumb);
    slider.appendChild(tooltip);
    volume.appendChild(slider);

    // Computes a 0..1 volume from a pointer X relative to the track's bounding rect using the
    // SAME pure geometry as the headless layer (Req 1.6) and emits a volume intent (Req 2.1).
    // Returns `false` when the track has no width (jsdom / not laid out) so callers can bail.
    const emitVolumeAt = (clientX: number): boolean => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return false;
      }
      const offsetX = clientX - rect.left;
      const nextVolume = getVolumePercentage(offsetX, rect.width) / 100;
      this.dispatchRequest('playerstack-volume-request', { volume: nextVolume });
      return true;
    };

    // Press-and-drag volume (ported from `useVolumeSlider`): the press emits the initial volume
    // and starts a drag; subsequent moves emit the live volume continuously; the release emits
    // the final volume and ends the drag. A plain click still emits once via the press. The
    // pointer is captured (when supported) so the drag tracks past the track bounds — matching
    // the original which attached document-level mousemove/mouseup while sliding.
    const onPointerDown = (event: PointerEvent): void => {
      if (!emitVolumeAt(event.clientX)) {
        return;
      }
      this.dragging = true;
      // Reveal the percentage read-out while dragging (original `volumeSliding`).
      this.refreshTooltip();
      if (typeof slider.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
        try {
          slider.setPointerCapture(event.pointerId);
        } catch {
          // Ignore: capture is a best-effort enhancement (jsdom lacks it).
        }
      }
    };
    slider.addEventListener('pointerdown', onPointerDown);
    this.addDisposer(() => slider.removeEventListener('pointerdown', onPointerDown));

    const onPointerMove = (event: PointerEvent): void => {
      if (!this.dragging) {
        return;
      }
      emitVolumeAt(event.clientX);
      // Keep the read-out following the drag.
      this.refreshTooltip();
    };
    slider.addEventListener('pointermove', onPointerMove);
    this.addDisposer(() => slider.removeEventListener('pointermove', onPointerMove));

    const onPointerUp = (event: PointerEvent): void => {
      if (!this.dragging) {
        return;
      }
      this.dragging = false;
      emitVolumeAt(event.clientX);
      // Drag ended: keep the read-out only while still hovering (original hid it when the drag
      // ended unless the pointer stayed over the slider).
      this.refreshTooltip();
    };
    slider.addEventListener('pointerup', onPointerUp);
    this.addDisposer(() => slider.removeEventListener('pointerup', onPointerUp));

    // Hover reveals the percentage read-out too (original `sliderHovering`). Enter/leave are
    // non-bubbling so they track the slider precisely; leaving while dragging keeps it visible
    // (the drag flag still holds) until the drag ends.
    const onEnter = (): void => {
      this.sliderHovering = true;
      this.refreshTooltip();
    };
    const onLeave = (): void => {
      this.sliderHovering = false;
      // Only hide when not mid-drag; a drag that leaves the slider keeps showing until release.
      if (!this.dragging) {
        this.refreshTooltip();
      }
    };
    slider.addEventListener('pointerenter', onEnter);
    slider.addEventListener('pointerleave', onLeave);
    this.addDisposer(() => slider.removeEventListener('pointerenter', onEnter));
    this.addDisposer(() => slider.removeEventListener('pointerleave', onLeave));
    this.addDisposer(() => {
      this.dragging = false;
      this.sliderHovering = false;
    });

    this.muteButton = muteButton;
    this.trackFill = trackFill;
    this.thumb = thumb;
    this.tooltip = tooltip;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(muteButton);
    this.root.appendChild(volume);

    // Paint the initial fill from whatever volume the store has already delivered (if any).
    this.updateFill();
  }
}
