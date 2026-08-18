/**
 * Live DVR (Digital Video Recording) utilities.
 *
 * Provides framework-agnostic logic for live stream time-shifting:
 * - Determines the seekable DVR window from the video element's seekable TimeRanges
 * - Computes "live edge" position and whether the user is at the edge
 * - Calculates negative offset display (e.g., "-1:20:06" when behind live)
 *
 * How live DVR works:
 * HLS/DASH live streams expose a sliding seekable window via the video element's
 * `seekable` property. As new segments arrive, the window advances. The "live edge"
 * is the end of this window (the most current content). Users can seek backwards
 * within this window (DVR), and the UI shows a negative offset from live.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seekable
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/setLiveSeekableRange
 */

import type { LiveDVRState, LiveDVRConfig } from '@typings/live-dvr.types';

export type { LiveDVRState, LiveDVRConfig } from '@typings/live-dvr.types';

const DEFAULT_CONFIG: Required<LiveDVRConfig> = {
  minDVRWindow: 15,
  liveEdgeTolerance: 10,
};

/**
 * Compute the live DVR state from a media element.
 *
 * Call this on each timeupdate/progress event to get up-to-date DVR state.
 */
export function computeLiveDVRState(element: HTMLMediaElement | null, config: LiveDVRConfig = {}): LiveDVRState {
  const { minDVRWindow, liveEdgeTolerance } = { ...DEFAULT_CONFIG, ...config };

  const empty: LiveDVRState = {
    hasDVR: false,
    seekableStart: 0,
    seekableEnd: 0,
    seekableWindow: 0,
    isAtLiveEdge: true,
    liveEdgeOffset: 0,
    sliderDuration: 0,
    sliderPosition: 0,
  };

  if (!element) return empty;

  const seekable = element.seekable;
  if (!seekable || seekable.length === 0) return empty;

  // Use the last seekable range (most relevant for live)
  const seekableStart = seekable.start(seekable.length - 1);
  const seekableEnd = seekable.end(seekable.length - 1);
  const seekableWindow = seekableEnd - seekableStart;

  if (seekableWindow < minDVRWindow || !isFinite(seekableWindow)) {
    return { ...empty, seekableStart, seekableEnd, seekableWindow };
  }

  const currentTime = element.currentTime;
  const liveEdgeOffset = currentTime - seekableEnd; // Negative when behind
  const isAtLiveEdge = currentTime >= seekableEnd - liveEdgeTolerance;

  // Slider maps seekableStart..seekableEnd to 0..seekableWindow
  const sliderPosition = Math.max(0, Math.min(currentTime - seekableStart, seekableWindow));
  const sliderDuration = seekableWindow;

  return {
    hasDVR: true,
    seekableStart,
    seekableEnd,
    seekableWindow,
    isAtLiveEdge,
    liveEdgeOffset,
    sliderDuration,
    sliderPosition,
  };
}

/**
 * Convert a slider position (0..seekableWindow) back to an absolute seek time.
 */
export function sliderPositionToTime(position: number, seekableStart: number): number {
  return seekableStart + position;
}

/**
 * Format a live edge offset as a display string.
 * Returns "LIVE" if at edge, or a negative time string like "-1:20:06".
 */
export function formatLiveOffset(offsetSeconds: number, isAtLiveEdge: boolean): string {
  if (isAtLiveEdge) return '';

  const absSeconds = Math.abs(Math.round(offsetSeconds));
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `-${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `-${minutes}:${pad(seconds)}`;
}
