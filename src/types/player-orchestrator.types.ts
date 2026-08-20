/**
 * Configuration for PlayerOrchestrator constructor.
 */
export interface PlayerOrchestratorConfig {
  /** Interval in ms for progress polling. Default: 1000. */
  progressInterval?: number;
  /** Whether to call engine.destroy() when orchestrator is destroyed. Default: true. */
  stopOnDestroy?: boolean;
}

/**
 * Typed event map for PlayerOrchestrator.
 */
export interface PlayerOrchestratorEvents {
  progress: (data: {
    played: number;
    loaded: number;
    playedSeconds: number;
    loadedSeconds: number;
    bufferedRanges: Array<{ start: number; end: number }>;
  }) => void;
  duration: (duration: number) => void;
  ready: () => void;
  play: () => void;
  pause: () => void;
  ended: () => void;
  error: (error: unknown) => void;
  seek: (time: number) => void;
  loading: (isLoading: boolean) => void;
  /**
   * Forwarded from MediaEngine: a live stream transitioned to VOD (gained a
   * fixed duration / `#EXT-X-ENDLIST`). Skins should drop their live/DVR UI and
   * render the standard on-demand timeline.
   */
  liveEnded: () => void;
}
