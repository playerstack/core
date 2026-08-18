import type { PlayerAdapter } from '../adapters.types';

export interface QualitySwitchConfig {
  enabled: boolean;
  currentQuality: number | null;
  onQualityChange?: (quality: number) => void;
}

export interface UsePlayerOrchestrationParams {
  adapter: PlayerAdapter;
  playing: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  loop: boolean;
  url: string | null;
  progressInterval?: number;
  stopOnUnmount?: boolean;
  onProgress?: (state: { played: number; loaded: number }) => void;
  onDuration?: (duration: number) => void;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  onSeek?: (time: number) => void;
  qualitySwitch?: QualitySwitchConfig;
}

export interface UsePlayerOrchestrationReturn {
  isReady: boolean;
  isLoading: boolean;
  seekTo: (seconds: number, keepPlaying?: boolean) => void;
}
