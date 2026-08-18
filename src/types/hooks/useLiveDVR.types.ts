import type { LiveDVRState } from '@typings/live-dvr.types';
import type { DVRAdapter } from '@typings/adapters.types';

export interface UseLiveDVRParams {
  /** Platform adapter for DVR operations (null when unavailable). */
  adapter: DVRAdapter | null;
  /** Whether the stream is a live DVR stream. */
  liveDVR: boolean;
  /** Whether playback is active (used for subscribing to time updates). */
  playing: boolean;
}

export interface UseLiveDVRReturn {
  /** Full DVR state or null when disabled/unavailable. */
  dvrState: LiveDVRState | null;
  /** Whether current time is near the live edge. */
  isAtLiveEdge: boolean;
  /** Formatted live offset string (e.g. "-1:20:06") or empty string. */
  liveOffset: string;
  /** Seek to the live edge (end of seekable range). */
  seekToLive: () => void;
  /** Seek to a position given as a fraction of the DVR slider (0..sliderDuration). */
  seekToDVRPosition: (sliderPos: number) => void;
}
