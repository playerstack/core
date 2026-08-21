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
  }

  /**
   * Sets the `track-fill` width to the current volume as a percentage (Req 1.6, 3.3). A
   * volume of `0..1` maps directly to `0..100%`; `getVolumePercentage` clamps to that range
   * so out-of-bounds store values never produce an invalid width.
   */
  private updateFill(): void {
    if (this.trackFill === null) {
      return;
    }
    // Feed volume*100 as the "offset" against a width of 100 so the pure helper yields the
    // clamped percentage directly, keeping the fill math identical to the headless layer.
    const percentage = getVolumePercentage(this.volume * 100, 100);
    this.trackFill.style.width = `${percentage}%`;
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
    const iconMuted = document.createElement('span');
    iconMuted.className = 'icon icon-muted';
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

    track.appendChild(trackFill);
    slider.appendChild(track);
    slider.appendChild(thumb);
    volume.appendChild(slider);

    // A click on the slider computes a 0..1 volume from the pointer X relative to the track's
    // bounding rect using the SAME pure geometry as the headless layer (Req 1.6), then emits a
    // volume intent (Req 2.1). Kept simple: a single `click` handler; the MediaController owns
    // the actual volume change.
    const onSliderClick = (event: MouseEvent): void => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const offsetX = event.clientX - rect.left;
      const nextVolume = getVolumePercentage(offsetX, rect.width) / 100;
      this.dispatchRequest('playerstack-volume-request', { volume: nextVolume });
    };
    slider.addEventListener('click', onSliderClick);
    this.addDisposer(() => slider.removeEventListener('click', onSliderClick));

    this.muteButton = muteButton;
    this.trackFill = trackFill;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(muteButton);
    this.root.appendChild(volume);

    // Paint the initial fill from whatever volume the store has already delivered (if any).
    this.updateFill();
  }
}
