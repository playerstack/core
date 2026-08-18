export interface UsePlayerCallbackProxyParams {
  onBuffer?: () => void;
  onBufferEnd?: () => void;
  onDuration?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: any, data?: any, instance?: any, sdk?: string) => void;
  onPause?: () => void;
  onPlay?: (event?: { hasAudio?: boolean }) => void;
  onPlayBackRateChange?: (rate: number) => void;
  onProgress?: (progress: { played: number; loaded: number; playedSeconds?: number }) => void;
  onReady?: () => void;
  onSeek?: (time: number) => void;
  onStart?: () => void;
  onLoaded?: () => void;
  onMount?: () => void;
  /** Internal state updater — accepts a function `(prev) => next` or a partial object. */
  updateState: (partial: any) => void;
  /** Current player state (only `seeking` is read). */
  playerState: { seeking?: boolean; [key: string]: any };
  /** Extra props for URL resolution. */
  extraProps: {
    url?: string;
    sources?: Array<{ src: string; resolution: number }>;
    prevented?: boolean;
  };
  /**
   * Error types that are silently ignored (not fatal).
   * Defaults to `['networkError']`.
   */
  recoverableErrorTypes?: string[];
  /**
   * Error details that are silently ignored when the error type is `'mediaError'`.
   * Defaults to `['bufferStalledError', 'bufferNudgeOnStall', 'bufferAppendError', 'fragParsingError']`.
   */
  recoverableErrorDetails?: string[];
}

export interface UsePlayerCallbackProxyReturn {
  videoUrl: string | null;
  onBuffer: () => void;
  onBufferEnd: () => void;
  onDuration: (duration: number) => void;
  onEnded: () => void;
  onError: (error: any, data?: any, instance?: any, sdk?: string) => void;
  onPause: () => void;
  onPlay: (event?: { hasAudio?: boolean }) => void;
  onPlayBackRateChange: (rate: number) => void;
  onProgress: (progress: { played: number; loaded: number; playedSeconds?: number }) => void;
  onReady: () => void;
  onSeek: (time: number) => void;
  onStart: () => void;
  onLoaded: () => void;
  onMount: () => void;
}
