// Adapter interfaces for platform-specific implementations (Phase 2)
// Each adapter abstracts platform I/O so the same hook runs on web and React Native.

/**
 * Platform adapter for ad-related interactions.
 * Web implementations block native media session and open URLs in new tabs.
 * React Native implementations may use expo-linking or similar.
 */
export interface AdsPlatform {
  /** Block native media session controls during ad. Returns cleanup function. */
  blockMediaSession?: () => () => void;
  /** Open a URL (e.g., ad click-through) in the platform's browser. */
  openUrl?: (url: string) => void;
}

/**
 * Platform adapter for volume and mute control.
 * Web implementations wrap an HTMLMediaElement; native implementations
 * wrap expo-av or react-native-video.
 */
export interface VolumeAdapter {
  /** Get the current volume (0–1). */
  getVolume(): number;
  /** Set the volume (0–1). */
  setVolume(v: number): void;
  /** Whether the media is currently muted. */
  getMuted(): boolean;
  /** Set the muted state. */
  setMuted(muted: boolean): void;
  /** Subscribe to external volume/mute changes. Returns a cleanup function. */
  onVolumeChange(cb: (volume: number, muted: boolean) => void): () => void;
}

/**
 * Platform adapter for live DVR (time-shifting) functionality.
 * Web implementations wrap an HTMLMediaElement's seekable/currentTime;
 * native implementations wrap expo-av or react-native-video.
 */
export interface DVRAdapter {
  /** Get the current seekable range, or null if unavailable. */
  getSeekableRange(): { start: number; end: number } | null;
  /** Get the current playback time in seconds. */
  getCurrentTime(): number;
  /** Seek to the given absolute time in seconds. */
  seekTo(time: number): void;
  /** Subscribe to time update events. Returns a cleanup function. */
  onTimeUpdate(callback: () => void): () => void;
}

/**
 * Configuration object for a single ad unit.
 */
export interface AdsConfig {
  /** Seconds before skip becomes available. If undefined, no skip timer. */
  skipAfter?: number;
  /** Called when the user skips the ad. */
  onSkip?: () => void;
  /** Called when the user clicks the ad area. */
  onAdClick?: () => void;
  /** Called when the ad video completes (reaches end). */
  onAdComplete?: () => void;
  /** Click-through URL opened when ad is clicked. */
  url?: string;
}

/**
 * Platform adapter for player media operations.
 * Web implementations wrap HTMLMediaElement/HTMLAudioElement;
 * native implementations wrap expo-av or react-native-video.
 *
 * This is the comprehensive interface for Phase 3 orchestration hooks.
 */
export interface PlayerAdapter {
  /** Start playback. */
  play(): void;
  /** Pause playback. */
  pause(): void;
  /** Stop and unload media. */
  stop(): void;
  /** Load a media source URL. `isReady` indicates if immediate playback is expected. */
  load(url: string, isReady?: boolean): void;
  /** Seek to an absolute position in seconds. `keepPlaying` preserves play state. */
  seekTo(seconds: number, keepPlaying?: boolean): void;
  /** Set the volume (0–1). */
  setVolume(v: number): void;
  /** Mute the media. */
  mute(): void;
  /** Unmute the media. */
  unmute(): void;
  /** Set the playback rate (1 = normal). */
  setPlaybackRate(rate: number): void;
  /** Get total duration in seconds, or null if unknown. */
  getDuration(): number | null;
  /** Get current playback position in seconds, or null if unavailable. */
  getCurrentTime(): number | null;
  /** Get the number of seconds currently loaded/buffered, or null. */
  getSecondsLoaded(): number | null;
}
