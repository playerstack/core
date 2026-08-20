import { EventEmitter } from '@event-emitter';
import { sliderPositionToTime, formatLiveOffset } from '@live-dvr';
import type { LiveDVRState } from '@typings/live-dvr.types';
import type { DVRAdapter } from '@typings/adapters.types';
import type { LiveDVRControllerEvents } from '@typings/live-dvr-controller.types';

export type { LiveDVRControllerEvents } from '@typings/live-dvr-controller.types';
export type { DVRAdapter } from '@typings/adapters.types';

const MIN_DVR_WINDOW = 15;
const LIVE_EDGE_TOLERANCE = 10;

/**
 * Framework-agnostic live DVR (time-shifting) controller.
 *
 * Computes DVR state from adapter data, detects live edge position,
 * and provides seek actions (seekToLive, seekToDVRPosition).
 * Emits `dvrStateChange` on every time update.
 *
 * All platform I/O flows through the injected DVRAdapter.
 */
export class LiveDVRController extends EventEmitter<
  LiveDVRControllerEvents & Record<string, (...args: any[]) => void>
> {
  private adapter: DVRAdapter;
  private _state: LiveDVRState | null = null;
  private _unsubscribe: (() => void) | null = null;
  private _destroyed = false;

  constructor(adapter: DVRAdapter) {
    super();
    this.adapter = adapter;
    this._unsubscribe = adapter.onTimeUpdate(() => this._update());
    this._update(); // initial computation
  }

  // ─── Public Getters ───────────────────────────────────────

  get state(): LiveDVRState | null {
    return this._state;
  }

  get isAtLiveEdge(): boolean {
    return this._state?.isAtLiveEdge ?? true;
  }

  get liveOffset(): string {
    return this._state ? formatLiveOffset(this._state.liveEdgeOffset, this._state.isAtLiveEdge) : '';
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Seek to the live edge (end of seekable range).
   */
  seekToLive(): void {
    if (this._destroyed) return;
    const range = this.adapter.getSeekableRange();
    if (range) this.adapter.seekTo(range.end);
  }

  /**
   * Seek to a position within the DVR window.
   * @param sliderPos - Position in 0..sliderDuration range.
   */
  seekToDVRPosition(sliderPos: number): void {
    if (this._destroyed) return;
    if (!this._state) return;
    const time = sliderPositionToTime(sliderPos, this._state.seekableStart);
    this.adapter.seekTo(time);
  }

  // ─── Lifecycle ────────────────────────────────────────────

  /**
   * Destroy controller — unsubscribe from adapter and remove listeners.
   */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._unsubscribe) this._unsubscribe();
    this.removeAllListeners();
  }

  // ─── Private ──────────────────────────────────────────────

  private _update(): void {
    if (this._destroyed) return;

    const range = this.adapter.getSeekableRange();
    if (!range) {
      this._setState(null);
      return;
    }

    const { start, end } = range;
    const seekableWindow = end - start;

    if (seekableWindow < MIN_DVR_WINDOW || !isFinite(seekableWindow)) {
      this._setState(null);
      return;
    }

    const currentTime = this.adapter.getCurrentTime();
    const liveEdgeOffset = currentTime - end; // Negative when behind
    const isAtLiveEdge = currentTime >= end - LIVE_EDGE_TOLERANCE;
    const sliderPosition = Math.max(0, Math.min(currentTime - start, seekableWindow));

    this._setState({
      hasDVR: true,
      seekableStart: start,
      seekableEnd: end,
      seekableWindow,
      isAtLiveEdge,
      liveEdgeOffset,
      sliderDuration: seekableWindow,
      sliderPosition,
    });
  }

  private _setState(state: LiveDVRState | null): void {
    this._state = state;
    this.emit('dvrStateChange', state);
  }
}
