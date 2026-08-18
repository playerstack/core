/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useAds } from '../../src/hooks/useAds';
import type { AdsPlatform, AdsConfig } from '../../src/types/adapters.types';

describe('useAds', () => {
  const baseParams = {
    ads: null as AdsConfig | null | undefined,
    currentTime: 0,
    duration: 30,
    paused: true,
    ended: false,
    onPauseClick: jest.fn(),
    platform: undefined as AdsPlatform | undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAdActive', () => {
    it('returns false when ads is null', () => {
      const { result } = renderHook(() => useAds({ ...baseParams, ads: null }));
      expect(result.current.isAdActive).toBe(false);
    });

    it('returns false when ads is undefined', () => {
      const { result } = renderHook(() => useAds({ ...baseParams, ads: undefined }));
      expect(result.current.isAdActive).toBe(false);
    });

    it('returns true when ads is provided and playback starts (paused -> playing)', () => {
      const ads: AdsConfig = { skipAfter: 5 };
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: true } },
      );

      expect(result.current.isAdActive).toBe(false);

      // Simulate play (transition from paused to playing)
      rerender({ ...baseParams, ads, paused: false });

      expect(result.current.isAdActive).toBe(true);
    });

    it('returns true immediately when already playing on mount (autoplay)', () => {
      const ads: AdsConfig = { skipAfter: 5 };
      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, ended: false }),
      );
      expect(result.current.isAdActive).toBe(true);
    });

    it('resets to false when ads prop is removed', () => {
      const ads: AdsConfig = { skipAfter: 5 };
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false } },
      );

      expect(result.current.isAdActive).toBe(true);

      rerender({ ...baseParams, ads: null, paused: false });

      expect(result.current.isAdActive).toBe(false);
    });
  });

  describe('canSkip and skipCountdown', () => {
    it('canSkip becomes true after skipAfter seconds', () => {
      const ads: AdsConfig = { skipAfter: 5 };
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, currentTime: 0 } },
      );

      expect(result.current.canSkip).toBe(false);
      expect(result.current.skipCountdown).toBe(5);

      rerender({ ...baseParams, ads, paused: false, currentTime: 3 });
      expect(result.current.canSkip).toBe(false);
      expect(result.current.skipCountdown).toBe(2);

      rerender({ ...baseParams, ads, paused: false, currentTime: 5 });
      expect(result.current.canSkip).toBe(true);
      expect(result.current.skipCountdown).toBe(0);
    });

    it('skipCountdown decreases over time', () => {
      const ads: AdsConfig = { skipAfter: 10 };
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, currentTime: 0 } },
      );

      expect(result.current.skipCountdown).toBe(10);

      rerender({ ...baseParams, ads, paused: false, currentTime: 4.5 });
      expect(result.current.skipCountdown).toBe(6); // Math.ceil(10 - 4.5) = 6

      rerender({ ...baseParams, ads, paused: false, currentTime: 9.1 });
      expect(result.current.skipCountdown).toBe(1); // Math.ceil(10 - 9.1) = 1

      rerender({ ...baseParams, ads, paused: false, currentTime: 10 });
      expect(result.current.skipCountdown).toBe(0);
    });

    it('hasSkipTimer is false when skipAfter is undefined', () => {
      const ads: AdsConfig = {};
      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false }),
      );
      expect(result.current.hasSkipTimer).toBe(false);
      expect(result.current.canSkip).toBe(false);
      expect(result.current.skipCountdown).toBe(0);
    });
  });

  describe('adProgress', () => {
    it('reports progress as fraction when skipAfter is set', () => {
      const ads: AdsConfig = { skipAfter: 10 };
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, currentTime: 0 } },
      );

      expect(result.current.adProgress).toBe(0);

      rerender({ ...baseParams, ads, paused: false, currentTime: 5 });
      expect(result.current.adProgress).toBe(0.5);

      rerender({ ...baseParams, ads, paused: false, currentTime: 10 });
      expect(result.current.adProgress).toBe(1);
    });

    it('reports progress as currentTime/duration when no skipAfter', () => {
      const ads: AdsConfig = {};
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, duration: 20, currentTime: 0 } },
      );

      expect(result.current.adProgress).toBe(0);

      rerender({ ...baseParams, ads, paused: false, duration: 20, currentTime: 10 });
      expect(result.current.adProgress).toBe(0.5);
    });

    it('caps at 1 when currentTime exceeds skipAfter', () => {
      const ads: AdsConfig = { skipAfter: 5 };
      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, currentTime: 0 } },
      );

      rerender({ ...baseParams, ads, paused: false, currentTime: 8 });
      expect(result.current.adProgress).toBe(1);
    });
  });

  describe('onSkipClick', () => {
    it('calls ads.onSkip when ad is active', () => {
      const onSkip = jest.fn();
      const ads: AdsConfig = { skipAfter: 5, onSkip };
      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, currentTime: 6 }),
      );

      act(() => {
        result.current.onSkipClick();
      });

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('does nothing when ad is not active', () => {
      const onSkip = jest.fn();
      const ads: AdsConfig = { skipAfter: 5, onSkip };
      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: true }),
      );

      act(() => {
        result.current.onSkipClick();
      });

      expect(onSkip).not.toHaveBeenCalled();
    });
  });

  describe('onAdClick', () => {
    it('calls platform.openUrl and ads.onAdClick', () => {
      const onAdClick = jest.fn();
      const onPauseClick = jest.fn();
      const openUrl = jest.fn();
      const ads: AdsConfig = { onAdClick, url: 'https://example.com' };
      const platform: AdsPlatform = { openUrl };

      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, onPauseClick, platform }),
      );

      act(() => {
        result.current.onAdClick();
      });

      expect(onPauseClick).toHaveBeenCalledTimes(1);
      expect(onAdClick).toHaveBeenCalledTimes(1);
      expect(openUrl).toHaveBeenCalledWith('https://example.com');
    });

    it('does not call openUrl when platform is undefined', () => {
      const onAdClick = jest.fn();
      const onPauseClick = jest.fn();
      const ads: AdsConfig = { onAdClick, url: 'https://example.com' };

      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, onPauseClick, platform: undefined }),
      );

      act(() => {
        result.current.onAdClick();
      });

      expect(onPauseClick).toHaveBeenCalledTimes(1);
      expect(onAdClick).toHaveBeenCalledTimes(1);
      // No crash — openUrl is simply not called
    });

    it('does not call openUrl when ads.url is absent', () => {
      const openUrl = jest.fn();
      const ads: AdsConfig = { onAdClick: jest.fn() };
      const platform: AdsPlatform = { openUrl };

      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, platform }),
      );

      act(() => {
        result.current.onAdClick();
      });

      expect(openUrl).not.toHaveBeenCalled();
    });
  });

  describe('platform adapter', () => {
    it('no crash when platform is undefined', () => {
      const ads: AdsConfig = { skipAfter: 5 };
      const { result } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, platform: undefined }),
      );

      expect(result.current.isAdActive).toBe(true);
      // No throw
    });

    it('calls blockMediaSession when ad activates and platform provides it', () => {
      const cleanup = jest.fn();
      const blockMediaSession = jest.fn(() => cleanup);
      const platform: AdsPlatform = { blockMediaSession };
      const ads: AdsConfig = { skipAfter: 5 };

      const { result, rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: true, platform } },
      );

      expect(blockMediaSession).not.toHaveBeenCalled();

      // Activate ad
      rerender({ ...baseParams, ads, paused: false, platform });

      expect(blockMediaSession).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();
    });

    it('calls cleanup when ad deactivates', () => {
      const cleanup = jest.fn();
      const blockMediaSession = jest.fn(() => cleanup);
      const platform: AdsPlatform = { blockMediaSession };
      const ads: AdsConfig = { skipAfter: 5 };

      const { rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, platform } },
      );

      expect(blockMediaSession).toHaveBeenCalledTimes(1);

      // Deactivate ad by removing ads prop
      rerender({ ...baseParams, ads: null, paused: false, platform });

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAdComplete', () => {
    it('calls ads.onAdComplete when ad ends', () => {
      const onAdComplete = jest.fn();
      const ads: AdsConfig = { onAdComplete };

      const { rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, ended: false } },
      );

      rerender({ ...baseParams, ads, paused: false, ended: true });

      expect(onAdComplete).toHaveBeenCalledTimes(1);
    });

    it('does not call onAdComplete multiple times', () => {
      const onAdComplete = jest.fn();
      const ads: AdsConfig = { onAdComplete };

      const { rerender } = renderHook(
        (props) => useAds(props),
        { initialProps: { ...baseParams, ads, paused: false, ended: false } },
      );

      rerender({ ...baseParams, ads, paused: false, ended: true });
      rerender({ ...baseParams, ads, paused: false, ended: true });

      expect(onAdComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup on unmount', () => {
    it('runs platform cleanup on unmount', () => {
      const cleanup = jest.fn();
      const blockMediaSession = jest.fn(() => cleanup);
      const platform: AdsPlatform = { blockMediaSession };
      const ads: AdsConfig = { skipAfter: 5 };

      const { unmount } = renderHook(() =>
        useAds({ ...baseParams, ads, paused: false, platform }),
      );

      expect(cleanup).not.toHaveBeenCalled();

      unmount();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });
});
