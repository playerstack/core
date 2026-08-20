import { EventEmitter } from '@event-emitter';
import type { AdsConfig } from '@typings/adapters.types';
import type { AdsControllerEvents, AdsState } from '@typings/ads-controller.types';

export type { AdsControllerEvents, AdsState } from '@typings/ads-controller.types';
export type { AdsConfig } from '@typings/adapters.types';

/**
 * Framework-agnostic ads controller.
 *
 * Manages pre-roll activation (first play), skip timer computation,
 * progress tracking, and completion detection. Emits events that
 * skin packages subscribe to for reactive ad overlay updates.
 */
export class AdsController extends EventEmitter<AdsControllerEvents & Record<string, (...args: any[]) => void>> {
  private _ads: AdsConfig | null = null;
  private _adStarted = false;
  private _adCompleted = false;
  private _destroyed = false;
  private _skippableEmitted = false;

  // ─── Public API ───────────────────────────────────────────

  /**
   * Configure the controller with an ad config, or null to deactivate.
   * Resets internal state.
   */
  configure(ads: AdsConfig | null): void {
    if (this._destroyed) return;
    this._ads = ads;
    this._adStarted = false;
    this._adCompleted = false;
    this._skippableEmitted = false;
  }

  /**
   * Notify the controller that playback started.
   * Triggers pre-roll activation on first call when ads are configured.
   */
  notifyPlay(): void {
    if (this._destroyed) return;
    if (this._ads && !this._adStarted) {
      this._adStarted = true;
      this.emit('adActivated');
    }
  }

  /**
   * Update ad state based on current playback position.
   * Should be called on each time update while ad is active.
   */
  update(currentTime: number, duration: number, ended: boolean): void {
    if (!this._ads || !this._adStarted || this._destroyed) return;

    const skipAfter = this._ads.skipAfter;
    const hasSkipTimer = typeof skipAfter === 'number' && skipAfter > 0;
    const canSkip = hasSkipTimer && currentTime >= skipAfter!;
    const skipCountdown = hasSkipTimer ? Math.max(0, Math.ceil(skipAfter! - currentTime)) : 0;

    let adProgress = 0;
    if (hasSkipTimer) {
      adProgress = Math.min(1, currentTime / skipAfter!);
    } else if (duration > 0) {
      adProgress = currentTime / duration;
    }

    this.emit('adProgress', { progress: adProgress, canSkip, skipCountdown });
    this.emit('stateChange', {
      isAdActive: true,
      hasSkipTimer,
      canSkip,
      skipCountdown,
      adProgress,
    });

    if (canSkip && !this._skippableEmitted) {
      this._skippableEmitted = true;
      this.emit('adSkippable');
    }

    if (ended && !this._adCompleted) {
      this._adCompleted = true;
      this.emit('adCompleted');
      if (this._ads.onAdComplete) this._ads.onAdComplete();
    }
  }

  /**
   * Called when the user skips the ad.
   */
  onSkip(): void {
    if (this._destroyed) return;
    if (this._ads?.onSkip) this._ads.onSkip();
  }

  /**
   * Called when the user clicks the ad overlay.
   */
  onAdClick(): void {
    if (this._destroyed) return;
    if (this._ads?.onAdClick) this._ads.onAdClick();
  }

  // ─── Public Getters ───────────────────────────────────────

  get isAdActive(): boolean {
    return this._adStarted && this._ads !== null;
  }

  get state(): AdsState {
    return {
      isAdActive: this.isAdActive,
      hasSkipTimer: this.isAdActive && typeof this._ads!.skipAfter === 'number' && this._ads!.skipAfter! > 0,
      canSkip: false,
      skipCountdown: 0,
      adProgress: 0,
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Destroy controller — remove all listeners.
   */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.removeAllListeners();
  }
}
