export interface LiveDVRState {
  /** Whether the stream has a usable DVR window (seekable range > minWindow) */
  hasDVR: boolean;
  /** Start of the seekable range in seconds */
  seekableStart: number;
  /** End of the seekable range in seconds (the live edge) */
  seekableEnd: number;
  /** Total length of the seekable window in seconds */
  seekableWindow: number;
  /** Whether the current playback position is at/near the live edge */
  isAtLiveEdge: boolean;
  /** Offset from live edge in seconds (negative value, e.g. -80 means 80s behind) */
  liveEdgeOffset: number;
  /** Duration value to use for the slider (seekableWindow) */
  sliderDuration: number;
  /** Current position within the slider (0 to sliderDuration) */
  sliderPosition: number;
}

export interface LiveDVRConfig {
  /**
   * Minimum seekable window in seconds before DVR is considered available.
   * Streams with a shorter window won't show a timeline.
   * @default 15
   */
  minDVRWindow?: number;
  /**
   * Tolerance in seconds for "at live edge" detection.
   * If currentTime is within this many seconds of seekableEnd, consider at edge.
   * @default 10
   */
  liveEdgeTolerance?: number;
}
