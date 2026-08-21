/**
 * `playerstack-live-indicator` — the LIVE status indicator with an at-edge dot and a
 * behind-live offset readout (Req 1.4, 1.6, 3.3, 5.1, 5.3).
 *
 * WHY it does NOT own a controller like the ad overlay does:
 *   The headless `computeLiveDVRState`/`LiveDVRController` derive DVR state from a real
 *   `HTMLMediaElement`'s `seekable` TimeRanges (or a `DVRAdapter`), neither of which this
 *   UI_Element owns — the element lives inside the Shadow DOM and never touches the media
 *   element directly (Request/Response model, Req 2.1). So instead of instantiating a
 *   controller with an adapter it does not have, the element exposes a public `dvrState`
 *   setter that the adapter/consumer feeds from `computeLiveDVRState(mediaEl, config)` (or
 *   from a `LiveDVRController`'s `dvrStateChange` event) computed on the real media element.
 *
 * Reuse of the headless layer (Req 1.6): the offset text is produced by the SAME pure helper
 * the rest of Core uses — `formatLiveOffset(state.liveEdgeOffset, state.isAtLiveEdge)` from
 * `@live-dvr` — so the readout stays consistent without duplicating the formatting math here.
 *
 * On each `dvrState` set the element:
 *   - reflects `data-live` (a usable DVR window is present) and `data-at-edge` (currently at
 *     the live edge) onto the host so the Style_Layer can paint the dot and toggle the offset
 *     (Req 3.3);
 *   - writes the formatted negative offset into `part="live-offset"` (empty when at edge).
 *
 * Interaction (Req 2.1): clicking the indicator while behind live expresses a "jump to live"
 * intent as a `playerstack-seek-request` targeting `state.seekableEnd`; the `MediaController`
 * routes it to the `PlayerAdapter`. When already at the edge (or no DVR) the click is a no-op.
 */
import type { LiveIndicatorPart, LiveIndicatorDVRState } from '@typings/ui/playerstack-live-indicator.types';
import type { SeekRequestDetail } from '@typings/ui/media-controller.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { formatLiveOffset } from '@live-dvr';

export class PlayerstackLiveIndicator extends PlayerstackElement {
  /** The rendered indicator container; kept so `render` stays idempotent across reconnects. */
  private indicator: HTMLElement | null = null;

  /** The rendered offset text region whose content mirrors the formatted live offset. */
  private offset: HTMLElement | null = null;

  /**
   * The latest DVR state fed by the adapter/consumer, retained so a click can target the
   * current live edge (`seekableEnd`) even between renders.
   */
  private latestState: LiveIndicatorDVRState | null = null;

  /**
   * Public setter the adapter/consumer feeds from `computeLiveDVRState(mediaEl, config)` (or a
   * `LiveDVRController`'s `dvrStateChange` event) on the real media element. On set it reflects
   * the live/at-edge state onto the host and renders the formatted offset via the shared
   * `formatLiveOffset` helper (Req 1.6).
   */
  set dvrState(state: LiveIndicatorDVRState | null) {
    this.latestState = state;
    this.applyState(state);
  }

  /**
   * Builds the Markup_Contract: a `part="live-indicator"` container holding a `part="live-dot"`
   * status dot and a `part="live-offset"` text region. Nodes are created and APPENDED (never
   * via `innerHTML`) so the adopted Style_Layer survives. A guard keeps `render` idempotent
   * across reconnects, and the click handler is paired with a disposer for deterministic
   * cleanup. After (re)render the last known DVR state is re-applied so a reconnect restores
   * the visible offset/state.
   */
  protected render(): void {
    if (this.indicator !== null) {
      this.applyState(this.latestState);
      return;
    }

    const indicatorPart: LiveIndicatorPart = 'live-indicator';
    const indicator = document.createElement('div');
    indicator.setAttribute('part', indicatorPart);

    const dotPart: LiveIndicatorPart = 'live-dot';
    const dot = document.createElement('span');
    dot.setAttribute('part', dotPart);

    const offsetPart: LiveIndicatorPart = 'live-offset';
    const offset = document.createElement('span');
    offset.setAttribute('part', offsetPart);

    // A click while behind live jumps to the live edge via a seek request (Req 2.1); at the
    // edge (or with no DVR) it is a no-op so the indicator stays inert when there is nothing
    // to catch up to.
    const onClick = (): void => this.seekToLive();
    indicator.addEventListener('click', onClick);
    this.addDisposer(() => indicator.removeEventListener('click', onClick));

    indicator.appendChild(dot);
    indicator.appendChild(offset);

    this.indicator = indicator;
    this.offset = offset;

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(indicator);

    // Restore any state fed before the element was connected/rendered.
    this.applyState(this.latestState);
  }

  /**
   * Reflects `data-live`/`data-at-edge` from the DVR state and writes the formatted offset
   * into the offset region (Req 1.6, 3.3). A `null` state means DVR is unavailable: clear the
   * offset and reflect not-live.
   */
  private applyState(state: LiveIndicatorDVRState | null): void {
    if (state === null || !state.hasDVR) {
      this.reflectState({ live: null, atEdge: null });
      if (this.offset !== null) {
        this.offset.textContent = '';
      }
      return;
    }

    this.reflectState({ live: true, atEdge: state.isAtLiveEdge });
    if (this.offset !== null) {
      // Shared pure formatter keeps the readout consistent with the rest of Core (Req 1.6).
      this.offset.textContent = formatLiveOffset(state.liveEdgeOffset, state.isAtLiveEdge);
    }
  }

  /**
   * Emits a `playerstack-seek-request` targeting the current live edge (`seekableEnd`) when
   * behind live, so the `MediaController` can route the jump-to-live to the `PlayerAdapter`
   * (Req 2.1). No-op when at the edge or when DVR is unavailable.
   */
  private seekToLive(): void {
    const state = this.latestState;
    if (state === null || !state.hasDVR || state.isAtLiveEdge) {
      return;
    }
    this.dispatchRequest<SeekRequestDetail>('playerstack-seek-request', { time: state.seekableEnd });
  }
}
