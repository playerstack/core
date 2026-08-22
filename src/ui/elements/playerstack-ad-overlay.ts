/**
 * `playerstack-ad-overlay` — the ad overlay with skip-ad, progress and click-through (Req 1.4,
 * 1.6, 3.3, 5.1, 5.3).
 *
 * Unlike the request-only control elements, this overlay OWNS a headless `AdsController`
 * instance (Req 1.6). That controller is framework-agnostic and has no adapter dependency —
 * it only tracks pre-roll activation, the skip timer, ad progress and completion — so it is
 * safe for the element to instantiate and drive it directly. This keeps the ad logic in the
 * shared Core controller rather than reimplemented in the element.
 *
 * Wiring:
 *   - Config: the public `ads` setter forwards an `AdsConfig` (from `@typings/adapters.types`)
 *     to `controller.configure(...)`, so consumers/adapters attach `skipAfter`, `onSkip`,
 *     `onAdClick`, `onAdComplete` and `url` the same way the rest of Core does.
 *   - Store → controller: `onStoreChange` calls `controller.notifyPlay()` when playback first
 *     becomes true (guarded once) to trigger pre-roll activation, and forwards progress via
 *     `controller.update(seek, duration, isEnded)` so the skip timer and progress recompute
 *     (Req 1.6).
 *   - Controller → overlay: the element subscribes to the controller's `adActivated`,
 *     `adProgress`, `adSkippable`, `adCompleted` and `stateChange` events to show/hide the
 *     overlay, update the skip countdown and enable skip when `canSkip`, and paint progress.
 *     It reflects `data-active`/`data-skippable`/`data-can-skip` on the host (Req 3.3).
 *   - Interactions: a skip click calls `controller.onSkip()` (invoking the configured
 *     `onSkip`) and the click region calls `controller.onAdClick()`; both ALSO dispatch a
 *     `playerstack-ad-skip` / `playerstack-ad-click` request event for adapter extensibility.
 *
 * Because it owns a controller with registered listeners plus a `destroy()`, it overrides
 * `disconnectedCallback` to tear the controller down before running the base cleanup.
 *
 * Accessibility (Req 1.5): the rendered skip `<button>` carries the implicit ARIA `button`
 * role and its accessible name is configurable through the `aria-label` attribute; the default
 * English label applies when the consumer omits it.
 */
import type {
  AdOverlayAdsConfig,
  AdOverlayDefaultLabel,
  AdOverlayPart,
} from '@typings/ui/playerstack-ad-overlay.types';
import type { AdsState } from '@typings/ads-controller.types';
import type { MediaStoreState } from '@typings/ui/media-store.types';
import { PlayerstackElement } from '@ui/playerstack-element';
import { AdsController } from '@ads-controller';

/** Default accessible name used when no `aria-label` attribute is provided (Req 1.5). */
const DEFAULT_LABEL: AdOverlayDefaultLabel = 'Skip ad';

export class PlayerstackAdOverlay extends PlayerstackElement {
  /**
   * Declares `aria-label` as an observed attribute so the skip button's accessible name is
   * configurable via markup (Req 1.5). Keying the schema by `label` while mapping to the
   * `aria-label` attribute keeps the prop name readable and drives `observedAttributes`.
   */
  static override attributeSchema = {
    label: { attribute: 'aria-label', type: 'string' },
  } as const;

  /**
   * The owned headless ads controller (Req 1.6). Instantiated eagerly since it is a plain
   * state machine with no adapter dependency; torn down in `disconnectedCallback`.
   */
  private readonly controller = new AdsController();

  /**
   * Guards the one-time `notifyPlay()` call: pre-roll activation must fire exactly once when
   * playback first becomes true, not on every subsequent `playing` store update.
   */
  private notifiedPlay = false;

  /** The rendered overlay container; kept so `render` stays idempotent across reconnects. */
  private overlay: HTMLElement | null = null;

  /** The rendered skip button; kept so its label/state can be updated after render. */
  private skipButton: HTMLButtonElement | null = null;

  /**
   * Configures the owned controller with an ad config (or `null` to deactivate). Public
   * property so consumers/adapters attach ads the same way as the rest of Core; delegates to
   * the controller, which resets its internal state on (re)configure.
   */
  set ads(config: AdOverlayAdsConfig | null) {
    this.notifiedPlay = false;
    this.controller.configure(config);
  }

  /**
   * Drives the controller from the shared store (Req 1.6): triggers pre-roll activation once
   * when playback first becomes true, then forwards progress so the skip timer and ad progress
   * recompute. Only the fields the controller needs are read, per the base class's opt-in
   * `onStoreChange` design.
   */
  override onStoreChange(state: Readonly<MediaStoreState>): void {
    if (state.playing && !this.notifiedPlay) {
      this.notifiedPlay = true;
      this.controller.notifyPlay();
    }
    this.controller.update(state.seek, state.duration, state.isEnded);
  }

  /**
   * Builds the Markup_Contract: a `part="ad-overlay"` container (hidden until an ad is active)
   * holding a `part="ad-skip-button"` skip affordance and a clickable `part="ad-click"` region.
   *
   * NO separate `part="ad-progress"` bar is rendered: the normal `playerstack-time-slider`
   * doubles as the ad progress bar in ad mode (tinted yellow via its `adMode`), matching the
   * ORIGINAL where the TimeSlider WAS the ad progress and there was NO second bar. The skin
   * bridges the ad currentTime/duration into the shared store during an ad, so the slider fill
   * tracks ad progress without this overlay painting its own timeline (avoids the DOUBLE bar).
   *
   * Nodes are created and APPENDED (never via `innerHTML`) so the adopted Style_Layer — in the
   * fallback path an injected `<style>` — is preserved. A guard keeps `render` idempotent across
   * reconnects. Controller subscriptions are wired here and paired with disposers for
   * deterministic cleanup.
   */
  protected render(): void {
    if (this.overlay !== null) {
      return;
    }

    const overlayPart: AdOverlayPart = 'ad-overlay';
    const overlay = document.createElement('div');
    overlay.setAttribute('part', overlayPart);
    // Hidden until an ad activates; `adActivated` flips it on and `adCompleted` off.
    overlay.style.display = 'none';

    // Click-through region: a click routes to the controller (invoking the configured
    // `onAdClick`) and also dispatches a request event for adapter extensibility.
    const clickPart: AdOverlayPart = 'ad-click';
    const clickRegion = document.createElement('div');
    clickRegion.setAttribute('part', clickPart);
    const onAdClick = (): void => {
      this.controller.onAdClick();
      this.dispatchRequest('playerstack-ad-click');
    };
    clickRegion.addEventListener('click', onAdClick);
    this.addDisposer(() => clickRegion.removeEventListener('click', onAdClick));

    // Skip affordance: a click routes to the controller (invoking the configured `onSkip`) and
    // also dispatches a request event for adapter extensibility.
    const skipPart: AdOverlayPart = 'ad-skip-button';
    const skipButton = document.createElement('button');
    skipButton.setAttribute('part', skipPart);
    skipButton.setAttribute('type', 'button');
    // The accessible name comes from the host's `aria-label` when set, else the default
    // (Req 1.5). `<button>` already carries the implicit ARIA `button` role.
    skipButton.setAttribute('aria-label', this.getAttribute('aria-label') ?? DEFAULT_LABEL);
    // Disabled until the controller reports the ad is skippable.
    skipButton.disabled = true;
    const onSkipClick = (): void => {
      this.controller.onSkip();
      this.dispatchRequest('playerstack-ad-skip');
    };
    skipButton.addEventListener('click', onSkipClick);
    this.addDisposer(() => skipButton.removeEventListener('click', onSkipClick));

    overlay.appendChild(clickRegion);
    overlay.appendChild(skipButton);

    this.overlay = overlay;
    this.skipButton = skipButton;

    this.wireController();

    // Append (never clobber) so the adopted Style_Layer / fallback `<style>` survives.
    this.root.appendChild(overlay);
  }

  /**
   * Subscribes to the owned controller's events and mirrors them onto the overlay. Each
   * handler is paired with an `off` disposer so the subscriptions are cleaned up on disconnect
   * (the `destroy()` in `disconnectedCallback` also drops them; both paths keep teardown
   * deterministic).
   */
  private wireController(): void {
    const onActivated = (): void => {
      if (this.overlay !== null) {
        this.overlay.style.display = '';
      }
      this.reflectState({ active: true });
    };
    this.controller.on('adActivated', onActivated);
    this.addDisposer(() => this.controller.off('adActivated', onActivated));

    const onProgress = (data: { progress: number; canSkip: boolean; skipCountdown: number }): void => {
      // Ad PROGRESS is surfaced by the shared time-slider (tinted yellow in ad mode), NOT by a
      // separate bar in this overlay, so only the skip countdown/enabled state is updated here.
      this.updateSkip(data.canSkip, data.skipCountdown);
    };
    this.controller.on('adProgress', onProgress);
    this.addDisposer(() => this.controller.off('adProgress', onProgress));

    const onSkippable = (): void => {
      this.reflectState({ skippable: true });
    };
    this.controller.on('adSkippable', onSkippable);
    this.addDisposer(() => this.controller.off('adSkippable', onSkippable));

    const onStateChange = (state: AdsState): void => {
      // Reflect with camelCase keys so the base class's pure reflector maps `canSkip` ->
      // `data-can-skip` per its documented camelCase<->kebab contract (Req 3.3).
      this.reflectState({ active: state.isAdActive, skippable: state.hasSkipTimer, canSkip: state.canSkip });
      this.updateSkip(state.canSkip, state.skipCountdown);
    };
    this.controller.on('stateChange', onStateChange);
    this.addDisposer(() => this.controller.off('stateChange', onStateChange));

    const onCompleted = (): void => {
      if (this.overlay !== null) {
        this.overlay.style.display = 'none';
      }
      this.reflectState({ active: null, skippable: null, canSkip: null });
    };
    this.controller.on('adCompleted', onCompleted);
    this.addDisposer(() => this.controller.off('adCompleted', onCompleted));
  }

  /**
   * Enables/disables the skip button and updates its countdown text from the controller's
   * `canSkip`/`skipCountdown`, and reflects `data-can-skip` on the host (Req 3.3). Before the
   * ad is skippable the button shows the remaining seconds; once skippable it shows the label.
   */
  private updateSkip(canSkip: boolean, skipCountdown: number): void {
    if (this.skipButton === null) {
      return;
    }
    this.skipButton.disabled = !canSkip;
    // Parity with the original AdsOverlay: BEFORE the ad is skippable the affordance shows ONLY
    // the remaining seconds (the `StyledSkipMessage` countdown, no "Skip ad" text); ONCE
    // skippable it shows the "Skip ad" label. It never reads "Skip ad (N)".
    this.skipButton.textContent = canSkip ? DEFAULT_LABEL : String(skipCountdown);
    // camelCase key so the pure reflector maps `canSkip` -> `data-can-skip` (Req 3.3).
    this.reflectState({ canSkip });
  }

  /**
   * Tears down the owned controller (removing its listeners) before running the base class's
   * disposer cleanup, since this element owns a controller with subscriptions and a lifecycle
   * beyond the plain listener disposers.
   */
  override disconnectedCallback(): void {
    this.controller.destroy();
    super.disconnectedCallback();
  }
}
