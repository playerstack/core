/**
 * `playerstack-audio-controls` — the compact controls cluster for AUDIO players (Req 1.4, 1.6,
 * 3.3, 5.1, 5.3).
 *
 * Audio skins need a tighter surface than the full video control bar: a play/pause toggle, a
 * current-time / duration read-out, and a progress bar that doubles as a seek slider. Rather
 * than owning any playback logic, this element composes those affordances as request-emitting
 * controls, exactly like the video controls: a play/pause click emits a play/pause request and
 * a click on the progress bar emits a seek request that the `MediaController` routes to the
 * `PlayerAdapter` (Req 2.1). It NEVER touches the media element directly.
 *
 * The seek geometry reuses the SAME pure helper as the headless layer and the video time
 * slider — `getTimeFromSliderPosition` (from `@slider`) — so the emitted seek time stays
 * consistent across Core (Req 1.6). The time read-out uses the shared `formatTime`
 * (`@utils/format`) so the displayed strings match the rest of Core.
 *
 * State flows back through the shared store, whose shape is the full `PlayerState`. This
 * element only reads the AUDIO-relevant subset of that state; the fields it cares about
 * (playing, seek, duration, and the other audio fields) are the exact keys of
 * `audioPlayerStateInitial` (from `@player-state`), which this element imports and uses to
 * seed a local default snapshot so the relevant field set is derived from a single source of
 * truth instead of being hard-coded here (Req 1.6). On every store change it reflects
 * `data-playing` on the host (Req 3.3), updates the time text and repaints the played fill.
 *
 * Accessibility (Req 1.5): the rendered play/pause `<button>` carries the implicit ARIA
 * `button` role and its accessible name is configurable through the `aria-label` attribute;
 * the default English label applies when the consumer omits it.
 */
import type { AudioControlsDefaultLabel, AudioControlsPart } from '@typings/ui/playerstack-audio-controls.types';
import type { SeekRequestDetail } from '@typings/ui/media-controller.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import type { AudioPlayerState } from '@player-state';
import { PlayerstackElement } from '@ui/playerstack-element';
import { audioPlayerStateInitial } from '@player-state';
import { getTimeFromSliderPosition } from '@slider';
import { formatTime } from '@utils/format';

/** Default accessible name used when no `aria-label` attribute is provided (Req 1.5). */
const DEFAULT_LABEL: AudioControlsDefaultLabel = 'Play';

export class PlayerstackAudioControls extends PlayerstackElement {
  /**
   * Declares `aria-label` as an observed attribute so the play/pause button's accessible name
   * is configurable via markup (Req 1.5). Keying the schema by `label` while mapping to the
   * `aria-label` attribute keeps the prop name readable and drives `observedAttributes`.
   */
  static override attributeSchema = {
    label: { attribute: 'aria-label', type: 'string' },
  } as const;

  /**
   * Local snapshot of the AUDIO-relevant state, seeded from `audioPlayerStateInitial` so the
   * relevant field set (playing, seek, duration, ...) is derived from a single source of truth
   * rather than hard-coded here (Req 1.6). It is refreshed from the shared store on every
   * change; only `playing`, `seek` and `duration` drive the current markup.
   */
  private audioState: AudioPlayerState = { ...audioPlayerStateInitial };

  /** The rendered play/pause button; kept so `render` stays idempotent across reconnects. */
  private button: HTMLButtonElement | null = null;

  /** The rendered time read-out span; kept so `onStoreChange` can update it after render. */
  private timeSpan: HTMLSpanElement | null = null;

  /** The rendered played-fill element whose width mirrors `seek / duration` (Req 3.3). */
  private trackFill: HTMLElement | null = null;

  /**
   * Refreshes the local audio-state snapshot from the shared store, reflects `data-playing` on
   * the host (Req 3.3), and repaints the time text and played fill. Only the audio-relevant
   * fields are read, per the base class's opt-in `onStoreChange` design; `playing` is also
   * tracked for the click handler's play/pause decision.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    this.audioState = {
      ...this.audioState,
      playing: state.playing,
      seek: state.seek,
      duration: state.duration,
      volume: state.volume,
      isMuted: state.isMuted,
    };
    this.reflectState({ playing: state.playing });
    this.updateTime();
    this.updateFill();
  }

  /** Writes the current-time / duration read-out via the shared `formatTime` (Req 1.6). */
  private updateTime(): void {
    if (this.timeSpan === null) {
      return;
    }
    this.timeSpan.textContent = `${formatTime(this.audioState.seek)} / ${formatTime(this.audioState.duration)}`;
  }

  /**
   * Sets the played-fill width to `seek / duration` as a percentage (Req 1.6, 3.3), guarded so
   * a zero/unknown duration yields `0%` instead of a division by zero and clamped into
   * `[0, 1]` so out-of-range store values never overflow the track.
   */
  private updateFill(): void {
    if (this.trackFill === null) {
      return;
    }
    const { seek, duration } = this.audioState;
    const fraction = duration > 0 ? seek / duration : 0;
    const clamped = fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
    this.trackFill.style.width = `${clamped * 100}%`;
  }

  /**
   * Builds the Markup_Contract: a `part="audio-controls"` container holding a
   * `part="play-button"` `<button>` (with play/pause glyph spans the Style_Layer toggles by
   * reflected state), a `part="time"` read-out, and a `part="slider"`/`part="track"`/
   * `part="track-fill"` progress-and-seek bar. Nodes are created and APPENDED (never via
   * `innerHTML`) so the adopted Style_Layer — in the fallback path an injected `<style>` — is
   * preserved. A guard keeps `render` idempotent across reconnects.
   */
  protected render(): void {
    if (this.button !== null) {
      return;
    }

    const containerPart: AudioControlsPart = 'audio-controls';
    const container = document.createElement('div');
    container.setAttribute('part', containerPart);

    // Play/pause toggle.
    const buttonPart: AudioControlsPart = 'play-button';
    const button = document.createElement('button');
    button.setAttribute('part', buttonPart);
    button.setAttribute('type', 'button');
    // The accessible name comes from the host's `aria-label` when set, else the default
    // (Req 1.5). `<button>` already carries the implicit ARIA `button` role.
    button.setAttribute('aria-label', this.getAttribute('aria-label') ?? DEFAULT_LABEL);

    // Play/pause glyphs: class names match the Style_Layer selectors that hide the inactive
    // glyph based on the reflected `data-playing` state (Req 3.3).
    const iconPlay = document.createElement('span');
    iconPlay.className = 'icon icon-play';
    const iconPause = document.createElement('span');
    iconPause.className = 'icon icon-pause';
    button.appendChild(iconPlay);
    button.appendChild(iconPause);

    // A click emits play/pause intent based on the current `playing` state (Req 2.1).
    const onClick = (): void => {
      if (this.audioState.playing) {
        this.dispatchRequest('playerstack-pause-request');
      } else {
        this.dispatchRequest('playerstack-play-request');
      }
    };
    button.addEventListener('click', onClick);
    // Deterministic cleanup: drop the listener on disconnect (paired with the base class).
    this.addDisposer(() => button.removeEventListener('click', onClick));

    // Time read-out.
    const timePart: AudioControlsPart = 'time';
    const time = document.createElement('span');
    time.setAttribute('part', timePart);
    time.textContent = `${formatTime(0)} / ${formatTime(0)}`;

    // Progress/seek bar.
    const sliderPart: AudioControlsPart = 'slider';
    const slider = document.createElement('div');
    slider.setAttribute('part', sliderPart);

    const trackPart: AudioControlsPart = 'track';
    const track = document.createElement('div');
    track.setAttribute('part', trackPart);

    const trackFillPart: AudioControlsPart = 'track-fill';
    const trackFill = document.createElement('div');
    trackFill.setAttribute('part', trackFillPart);

    track.appendChild(trackFill);
    slider.appendChild(track);

    // A click on the progress bar expresses a seek intent to the pointed time (Req 2.1),
    // reusing the SAME pure geometry as the video time slider so the emitted time stays
    // consistent across Core (Req 1.6). The MediaController owns the actual seek.
    const onSliderClick = (event: MouseEvent): void => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const seekTime = getTimeFromSliderPosition(event.clientX, rect, this.audioState.duration);
      this.dispatchRequest<SeekRequestDetail>('playerstack-seek-request', { time: seekTime });
    };
    slider.addEventListener('click', onSliderClick);
    this.addDisposer(() => slider.removeEventListener('click', onSliderClick));

    container.appendChild(button);
    container.appendChild(time);
    container.appendChild(slider);

    this.button = button;
    this.timeSpan = time;
    this.trackFill = trackFill;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(container);

    // Paint from whatever state the store has already delivered (if the context resolved
    // before render ran).
    const state = this.store?.getState();
    if (state !== undefined) {
      this.audioState = {
        ...this.audioState,
        playing: state.playing,
        seek: state.seek,
        duration: state.duration,
        volume: state.volume,
        isMuted: state.isMuted,
      };
      this.updateTime();
      this.updateFill();
    }
  }
}
