/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { usePlayerOrchestration } from '../../src/hooks/usePlayerOrchestration';
import type { PlayerAdapter } from '../../src/types/adapters.types';

// ---------- Mock adapter factory ----------

function createMockAdapter(
  initial: { duration?: number | null; currentTime?: number | null; secondsLoaded?: number | null } = {},
): PlayerAdapter & {
  _duration: number | null;
  _currentTime: number | null;
  _secondsLoaded: number | null;
} {
  const adapter = {
    _duration: initial.duration !== undefined ? initial.duration : 120,
    _currentTime: initial.currentTime !== undefined ? initial.currentTime : 0,
    _secondsLoaded: initial.secondsLoaded !== undefined ? initial.secondsLoaded : 0,
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    load: jest.fn(),
    seekTo: jest.fn(),
    setVolume: jest.fn(),
    mute: jest.fn(),
    unmute: jest.fn(),
    setPlaybackRate: jest.fn(),
    getDuration: jest.fn(() => adapter._duration),
    getCurrentTime: jest.fn(() => adapter._currentTime),
    getSecondsLoaded: jest.fn(() => adapter._secondsLoaded),
  };
  return adapter;
}

// ---------- Default params helper ----------

function defaultParams(adapter: PlayerAdapter, overrides: Record<string, any> = {}) {
  return {
    adapter,
    playing: false,
    muted: false,
    volume: 0.8,
    playbackRate: 1,
    loop: false,
    url: 'http://example.com/video.mp4',
    ...overrides,
  };
}

describe('usePlayerOrchestration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------- Initial state ----------

  it('returns initial state with isReady false and isLoading true', () => {
    const adapter = createMockAdapter();
    const { result } = renderHook(() => usePlayerOrchestration(defaultParams(adapter)));

    expect(result.current.isReady).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('calls adapter.load with url on mount', () => {
    const adapter = createMockAdapter();
    renderHook(() => usePlayerOrchestration(defaultParams(adapter)));

    expect(adapter.load).toHaveBeenCalledWith('http://example.com/video.mp4');
  });

  it('does not call adapter.load on mount when url is null', () => {
    const adapter = createMockAdapter();
    renderHook(() => usePlayerOrchestration(defaultParams(adapter, { url: null })));

    expect(adapter.load).not.toHaveBeenCalled();
  });

  // ---------- Progress polling loop ----------

  it('calls onProgress at the progress interval when playing', () => {
    const adapter = createMockAdapter({ duration: 100, currentTime: 10, secondsLoaded: 50 });
    const onProgress = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playing: true, onProgress, progressInterval: 500 })),
    );

    // Simulate player ready + play
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    onProgress.mockClear();

    // Advance by the progress interval
    act(() => {
      adapter._currentTime = 15;
      jest.advanceTimersByTime(500);
    });

    expect(onProgress).toHaveBeenCalledWith({ played: 15 / 100, loaded: 50 / 100 });
  });

  it('does not call onProgress when values have not changed', () => {
    const adapter = createMockAdapter({ duration: 100, currentTime: 10, secondsLoaded: 50 });
    const onProgress = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playing: true, onProgress, progressInterval: 500 })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    // First tick with initial values
    act(() => {
      jest.advanceTimersByTime(500);
    });

    onProgress.mockClear();

    // Second tick — same values, no call
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('stops progress polling when paused', () => {
    const adapter = createMockAdapter({ duration: 100, currentTime: 10, secondsLoaded: 50 });
    const onProgress = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playing: true, onProgress, progressInterval: 500 })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    onProgress.mockClear();

    // Pause
    act(() => {
      notify.onPause();
    });

    // Advance — should not call onProgress because isPlaying is false
    act(() => {
      adapter._currentTime = 20;
      jest.advanceTimersByTime(500);
    });

    expect(onProgress).not.toHaveBeenCalled();
  });

  // ---------- Play/pause sync ----------

  it('calls adapter.play when playing prop changes to true', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { playing: false } },
    );

    // Make ready first
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.play.mockClear();
    rerender({ playing: true });

    expect(adapter.play).toHaveBeenCalled();
  });

  it('calls adapter.pause when playing prop changes to false', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { playing: true } },
    );

    // Make ready and playing
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    adapter.pause.mockClear();
    rerender({ playing: false });

    expect(adapter.pause).toHaveBeenCalled();
  });

  it('does not call play/pause before ready', () => {
    const adapter = createMockAdapter();
    const { rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { playing: false } },
    );

    adapter.play.mockClear();
    rerender({ playing: true });

    expect(adapter.play).not.toHaveBeenCalled();
  });

  // ---------- Volume sync ----------

  it('calls adapter.setVolume when volume changes', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { volume: 0.8 } },
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.setVolume.mockClear();
    rerender({ volume: 0.5 });

    expect(adapter.setVolume).toHaveBeenCalledWith(0.5);
  });

  // ---------- Mute sync ----------

  it('calls adapter.mute when muted changes to true', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { muted: false } },
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    rerender({ muted: true });

    expect(adapter.mute).toHaveBeenCalled();
  });

  it('calls adapter.unmute and sets volume when muted changes to false', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { muted: true, volume: 0.7 } },
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.unmute.mockClear();
    adapter.setVolume.mockClear();

    rerender({ muted: false, volume: 0.7 });

    expect(adapter.unmute).toHaveBeenCalled();

    // Volume is set on next tick after unmuting
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(adapter.setVolume).toHaveBeenCalledWith(0.7);
  });

  // ---------- Playback rate sync ----------

  it('calls adapter.setPlaybackRate when rate changes', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { playbackRate: 1 } },
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    rerender({ playbackRate: 2 });

    expect(adapter.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  // ---------- URL change loads new source ----------

  it('calls adapter.load when url changes', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { url: 'http://example.com/video1.mp4' } },
    );

    // Make ready
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.load.mockClear();
    rerender({ url: 'http://example.com/video2.mp4' });

    expect(adapter.load).toHaveBeenCalledWith('http://example.com/video2.mp4', true);
    expect(result.current.isLoading).toBe(true);
  });

  it('defers load when url changes before player is ready', () => {
    const adapter = createMockAdapter();
    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      { initialProps: { url: 'http://example.com/video1.mp4' } },
    );

    // URL changes before ready
    adapter.load.mockClear();
    rerender({ url: 'http://example.com/video2.mp4' });

    // Should not call load yet (deferred)
    expect(adapter.load).not.toHaveBeenCalledWith('http://example.com/video2.mp4', expect.anything());

    // Now trigger ready — should load the deferred URL
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    expect(adapter.load).toHaveBeenCalledWith('http://example.com/video2.mp4', true);
  });

  // ---------- Duration retry ----------

  it('retries getDuration when it returns null', () => {
    const adapter = createMockAdapter({ duration: null });
    const onDuration = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onDuration })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    // First check returns null
    expect(onDuration).not.toHaveBeenCalled();

    // After a few retries, set duration
    adapter._duration = 60;

    act(() => {
      jest.advanceTimersByTime(100); // 1st retry
    });

    expect(onDuration).toHaveBeenCalledWith(60);
  });

  it('stops retrying after max retries', () => {
    const adapter = createMockAdapter({ duration: null });
    const onDuration = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onDuration })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    // Advance past all retries (10 * 100ms = 1000ms)
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    // Should not have been called since duration is always null
    expect(onDuration).not.toHaveBeenCalled();
  });

  // ---------- Seek-on-play pattern ----------

  it('queues seek when player is not ready and applies on play', () => {
    const adapter = createMockAdapter();
    const onSeek = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onSeek })),
    );

    // Seek before ready
    act(() => {
      result.current.seekTo(30);
    });

    // Adapter should NOT have been called
    expect(adapter.seekTo).not.toHaveBeenCalled();

    // Now mark as ready and play
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    // The queued seek should have been applied
    expect(adapter.seekTo).toHaveBeenCalledWith(30);
  });

  it('seek-on-play expires after timeout', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() => usePlayerOrchestration(defaultParams(adapter)));

    // Seek before ready
    act(() => {
      result.current.seekTo(30);
    });

    // Expire the seek-on-play
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Now play — queued seek should be gone
    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.seekTo.mockClear();
    act(() => {
      notify.onPlay();
    });

    expect(adapter.seekTo).not.toHaveBeenCalled();
  });

  it('seekTo calls adapter immediately when ready', () => {
    const adapter = createMockAdapter();
    const onSeek = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onSeek })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.seekTo.mockClear();
    act(() => {
      result.current.seekTo(45, true);
    });

    expect(adapter.seekTo).toHaveBeenCalledWith(45, true);
    expect(onSeek).toHaveBeenCalledWith(45);
  });

  // ---------- Loop behavior ----------

  it('seeks to 0 and plays when ended and loop is true', () => {
    const adapter = createMockAdapter();
    const onEnded = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { loop: true, onEnded })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    adapter.seekTo.mockClear();
    adapter.play.mockClear();

    act(() => {
      notify.onEnded();
    });

    expect(adapter.seekTo).toHaveBeenCalledWith(0);
    expect(adapter.play).toHaveBeenCalled();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it('calls onEnded and does not loop when loop is false', () => {
    const adapter = createMockAdapter();
    const onEnded = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { loop: false, onEnded })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    adapter.seekTo.mockClear();

    act(() => {
      notify.onEnded();
    });

    expect(adapter.seekTo).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalled();
  });

  // ---------- Stop on unmount ----------

  it('calls adapter.stop on unmount when stopOnUnmount is true', () => {
    const adapter = createMockAdapter();
    const { unmount } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { stopOnUnmount: true })),
    );

    adapter.stop.mockClear();
    unmount();

    expect(adapter.stop).toHaveBeenCalled();
  });

  it('does not call adapter.stop on unmount when stopOnUnmount is false', () => {
    const adapter = createMockAdapter();
    const { unmount } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { stopOnUnmount: false })),
    );

    adapter.stop.mockClear();
    unmount();

    expect(adapter.stop).not.toHaveBeenCalled();
  });

  // ---------- Ready/Play/Pause callbacks ----------

  it('calls onReady when handleReady is invoked', () => {
    const adapter = createMockAdapter();
    const onReady = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onReady })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    expect(onReady).toHaveBeenCalled();
    expect(result.current.isReady).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('calls onPlay when handlePlay is invoked', () => {
    const adapter = createMockAdapter();
    const onPlay = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onPlay })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    expect(onPlay).toHaveBeenCalled();
  });

  it('calls onPause when handlePause is invoked', () => {
    const adapter = createMockAdapter();
    const onPause = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onPause })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });
    act(() => {
      notify.onPause();
    });

    expect(onPause).toHaveBeenCalled();
  });

  it('does not call onPause during quality switch', () => {
    const adapter = createMockAdapter({ currentTime: 30 });
    const onPause = jest.fn();
    const onQualityChange = jest.fn();

    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      {
        initialProps: {
          onPause,
          qualitySwitch: { enabled: true, currentQuality: 720, onQualityChange },
        },
      },
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    // Trigger quality change — sets isSwitchingQuality
    rerender({
      onPause,
      qualitySwitch: { enabled: true, currentQuality: 1080, onQualityChange },
    });

    // Now pause fires — should be suppressed
    act(() => {
      notify.onPause();
    });

    expect(onPause).not.toHaveBeenCalled();
  });

  // ---------- Error handling ----------

  it('calls onError and sets isLoading false', () => {
    const adapter = createMockAdapter();
    const onError = jest.fn();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { onError })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onError(new Error('test error'));
    });

    expect(onError).toHaveBeenCalledWith(new Error('test error'));
    expect(result.current.isLoading).toBe(false);
  });

  // ---------- Quality switch reload-at-position ----------

  it('remembers position and triggers quality change callback', () => {
    const adapter = createMockAdapter({ currentTime: 45 });
    const onQualityChange = jest.fn();

    const { result, rerender } = renderHook(
      (props) => usePlayerOrchestration(defaultParams(adapter, props)),
      {
        initialProps: {
          qualitySwitch: { enabled: true, currentQuality: 720, onQualityChange },
        },
      },
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    rerender({
      qualitySwitch: { enabled: true, currentQuality: 1080, onQualityChange },
    });

    expect(onQualityChange).toHaveBeenCalledWith(1080);

    // After the quality switch completes and play fires, the seek should apply
    act(() => {
      notify.onPlay();
    });

    expect(adapter.seekTo).toHaveBeenCalledWith(45);
  });

  // ---------- Playback rate sync on first play ----------

  it('sets playback rate on first play if not 1', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playbackRate: 2 })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.setPlaybackRate.mockClear();

    act(() => {
      notify.onPlay();
    });

    expect(adapter.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('does not set playback rate on first play if 1', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playbackRate: 1 })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    adapter.setPlaybackRate.mockClear();

    act(() => {
      notify.onPlay();
    });

    expect(adapter.setPlaybackRate).not.toHaveBeenCalled();
  });

  // ---------- onReady syncs volume ----------

  it('syncs volume on ready when not muted', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { volume: 0.6, muted: false })),
    );

    adapter.setVolume.mockClear();

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    expect(adapter.setVolume).toHaveBeenCalledWith(0.6);
  });

  it('does not sync volume on ready when muted', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { volume: 0.6, muted: true })),
    );

    adapter.setVolume.mockClear();

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    expect(adapter.setVolume).not.toHaveBeenCalled();
  });

  // ---------- Cleanup timers on unmount ----------

  it('cleans up all timers on unmount', () => {
    const adapter = createMockAdapter({ duration: null });
    const onProgress = jest.fn();

    const { result, unmount } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playing: true, onProgress })),
    );

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });
    act(() => {
      notify.onPlay();
    });

    unmount();

    // Advance time — no callbacks should fire
    onProgress.mockClear();
    jest.advanceTimersByTime(5000);

    expect(onProgress).not.toHaveBeenCalled();
  });

  // ---------- handleReady starts playback if playing prop is true ----------

  it('starts playback on ready when playing is true', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() =>
      usePlayerOrchestration(defaultParams(adapter, { playing: true })),
    );

    adapter.play.mockClear();

    const notify = (result.current as any)._notify;
    act(() => {
      notify.onReady();
    });

    expect(adapter.play).toHaveBeenCalled();
  });
});
