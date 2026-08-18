import type { AdsPlatform, AdsConfig } from '@typings/adapters.types';

export interface UseAdsParams {
  ads: AdsConfig | null | undefined;
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  onPauseClick?: () => void;
  /** Optional platform adapter. When absent, platform-specific effects are no-ops. */
  platform?: AdsPlatform;
}

export interface UseAdsReturn {
  isAdActive: boolean;
  hasSkipTimer: boolean;
  canSkip: boolean;
  skipCountdown: number;
  adProgress: number;
  onSkipClick: () => void;
  onAdClick: () => void;
}
