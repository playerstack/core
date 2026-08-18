import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseAdsParams, UseAdsReturn } from '@typings/hooks/useAds.types';

export type { UseAdsParams, UseAdsReturn } from '@typings/hooks/useAds.types';

/**
 * Hook to manage ads overlay state.
 *
 * Centralizes all ad logic including pre-roll activation (ad only activates
 * after first play), skip timer, ad completion detection, media session
 * blocking (via platform adapter), and ad click handling.
 *
 * No browser globals are accessed directly — all platform I/O flows through
 * the injected `platform` adapter. When `platform` is undefined (e.g. on RN
 * with no adapter), platform-specific effects are silently skipped.
 */
export function useAds({
  ads,
  currentTime,
  duration,
  paused,
  ended,
  onPauseClick,
  platform,
}: UseAdsParams): UseAdsReturn {
  const adsConfigured = ads !== null && ads !== undefined;

  // Pre-roll: ad activates only after first play
  const [adStarted, setAdStarted] = useState(() => {
    // If already playing on mount (e.g., autoplay), activate immediately
    return adsConfigured && !paused && !ended;
  });

  // Detect transition from paused to playing (first play triggers ad)
  const prevPausedRef = useRef(paused);
  useEffect(() => {
    if (adsConfigured && !adStarted && prevPausedRef.current && !paused) {
      setAdStarted(true);
    }
    prevPausedRef.current = paused;
  }, [adsConfigured, adStarted, paused]);

  // Reset when ads prop removed; auto-activate if already playing when ads prop appears
  const prevAdsConfiguredRef = useRef(adsConfigured);
  useEffect(() => {
    if (!adsConfigured) {
      setAdStarted(false);
    } else if (adsConfigured && !prevAdsConfiguredRef.current && !paused && !ended) {
      // ads prop just appeared while already playing — activate immediately
      setAdStarted(true);
    }
    prevAdsConfiguredRef.current = adsConfigured;
  }, [adsConfigured, paused, ended]);

  // The effective active state: configured + started
  const isAdActive = adsConfigured && adStarted;

  // Whether skip button has configurable time (skipAfter is a number)
  const hasSkipTimer = isAdActive && typeof ads!.skipAfter === 'number' && (ads!.skipAfter as number) > 0;

  // Whether user can skip (elapsed time >= skipAfter)
  const canSkip = useMemo(() => {
    if (!isAdActive) return false;
    if (!hasSkipTimer) return false;
    return currentTime >= ads!.skipAfter!;
  }, [isAdActive, hasSkipTimer, currentTime, ads]);

  // Countdown seconds remaining before skip is available
  const skipCountdown = useMemo(() => {
    if (!isAdActive || !hasSkipTimer) return 0;
    const remaining = Math.ceil(ads!.skipAfter! - currentTime);
    return remaining > 0 ? remaining : 0;
  }, [isAdActive, hasSkipTimer, currentTime, ads]);

  // Progress of ad timer (0 to 1)
  const adProgress = useMemo(() => {
    if (!isAdActive) return 0;
    if (hasSkipTimer) {
      const progress = currentTime / ads!.skipAfter!;
      return progress > 1 ? 1 : progress;
    }
    if (duration > 0) {
      return currentTime / duration;
    }
    return 0;
  }, [isAdActive, hasSkipTimer, currentTime, duration, ads]);

  // Detect ad video ended — call onAdComplete
  const adCompletedRef = useRef(false);
  useEffect(() => {
    if (isAdActive && ended && !adCompletedRef.current) {
      adCompletedRef.current = true;
      if (ads!.onAdComplete) {
        ads!.onAdComplete();
      }
    }
    if (!isAdActive) {
      adCompletedRef.current = false;
    }
  }, [isAdActive, ended, ads]);

  // Block media session via platform adapter during ads
  const blockCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isAdActive && platform?.blockMediaSession) {
      blockCleanupRef.current = platform.blockMediaSession();
    }

    return () => {
      if (blockCleanupRef.current) {
        blockCleanupRef.current();
        blockCleanupRef.current = null;
      }
    };
  }, [isAdActive, platform]);

  const onSkipClick = useCallback(() => {
    if (isAdActive && ads?.onSkip) {
      ads.onSkip();
    }
  }, [isAdActive, ads]);

  // Ad click: pause, notify, open URL via platform adapter
  const onAdClick = useCallback(() => {
    if (isAdActive) {
      if (onPauseClick) {
        onPauseClick();
      }
      if (ads!.onAdClick) {
        ads!.onAdClick();
      }
      if (ads!.url && platform?.openUrl) {
        platform.openUrl(ads!.url);
      }
    }
  }, [isAdActive, ads, onPauseClick, platform]);

  return {
    isAdActive,
    hasSkipTimer,
    canSkip,
    skipCountdown,
    adProgress,
    onSkipClick,
    onAdClick,
  };
}
