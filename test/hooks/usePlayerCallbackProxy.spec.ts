/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { usePlayerCallbackProxy } from '@hooks/usePlayerCallbackProxy';

describe('usePlayerCallbackProxy', () => {
  const baseParams = {
    updateState: jest.fn(),
    playerState: { seeking: false },
    extraProps: { url: 'https://example.com/video.mp4' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Referential stability ----

  it('proxy object maintains stable reference across re-renders', () => {
    const { result, rerender } = renderHook(
      (props) => usePlayerCallbackProxy(props),
      { initialProps: { ...baseParams, onPlay: jest.fn() } },
    );

    const firstProxy = result.current;

    rerender({ ...baseParams, onPlay: jest.fn() });

    const secondProxy = result.current;

    // Each callback should be the same function reference
    expect(secondProxy.onBuffer).toBe(firstProxy.onBuffer);
    expect(secondProxy.onBufferEnd).toBe(firstProxy.onBufferEnd);
    expect(secondProxy.onDuration).toBe(firstProxy.onDuration);
    expect(secondProxy.onEnded).toBe(firstProxy.onEnded);
    expect(secondProxy.onError).toBe(firstProxy.onError);
    expect(secondProxy.onPause).toBe(firstProxy.onPause);
    expect(secondProxy.onPlay).toBe(firstProxy.onPlay);
    expect(secondProxy.onPlayBackRateChange).toBe(firstProxy.onPlayBackRateChange);
    expect(secondProxy.onProgress).toBe(firstProxy.onProgress);
    expect(secondProxy.onReady).toBe(firstProxy.onReady);
    expect(secondProxy.onSeek).toBe(firstProxy.onSeek);
    expect(secondProxy.onStart).toBe(firstProxy.onStart);
    expect(secondProxy.onLoaded).toBe(firstProxy.onLoaded);
    expect(secondProxy.onMount).toBe(firstProxy.onMount);
  });

  // ---- Callback forwarding ----

  it('forwards onBuffer and sets isBuffering true', () => {
    const onBuffer = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onBuffer, updateState }),
    );

    act(() => { result.current.onBuffer(); });

    expect(onBuffer).toHaveBeenCalled();
    const updater = updateState.mock.calls[0][0];
    expect(updater({ isBuffering: false })).toEqual(expect.objectContaining({ isBuffering: true }));
  });

  it('forwards onBufferEnd and sets isBuffering false', () => {
    const onBufferEnd = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onBufferEnd, updateState }),
    );

    act(() => { result.current.onBufferEnd(); });

    expect(onBufferEnd).toHaveBeenCalled();
    const updater = updateState.mock.calls[0][0];
    expect(updater({ isBuffering: true })).toEqual(expect.objectContaining({ isBuffering: false }));
  });

  it('forwards onDuration and sets duration', () => {
    const onDuration = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onDuration, updateState }),
    );

    act(() => { result.current.onDuration(120); });

    expect(onDuration).toHaveBeenCalledWith(120);
    const updater = updateState.mock.calls[0][0];
    expect(updater({ duration: 0 })).toEqual(expect.objectContaining({ duration: 120 }));
  });

  it('forwards onEnded and sets isEnded true', () => {
    const onEnded = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onEnded, updateState }),
    );

    act(() => { result.current.onEnded(); });

    expect(onEnded).toHaveBeenCalled();
    const updater = updateState.mock.calls[0][0];
    expect(updater({ isEnded: false })).toEqual(expect.objectContaining({ isEnded: true }));
  });

  it('forwards onPause and sets playing false', () => {
    const onPause = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onPause, updateState }),
    );

    act(() => { result.current.onPause(); });

    expect(onPause).toHaveBeenCalled();
    const updater = updateState.mock.calls[0][0];
    expect(updater({ playing: true })).toEqual(expect.objectContaining({ playing: false }));
  });

  it('forwards onPlay and sets playing true, isEnded false', () => {
    const onPlay = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onPlay, updateState }),
    );

    act(() => { result.current.onPlay({ hasAudio: true }); });

    expect(onPlay).toHaveBeenCalledWith({ hasAudio: true });
    const updater = updateState.mock.calls[0][0];
    expect(updater({ playing: false, isEnded: true, hasAudio: false })).toEqual(
      expect.objectContaining({ playing: true, isEnded: false, hasAudio: true }),
    );
  });

  it('forwards onPlayBackRateChange and sets playbackRate', () => {
    const onPlayBackRateChange = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onPlayBackRateChange, updateState }),
    );

    act(() => { result.current.onPlayBackRateChange(2); });

    expect(onPlayBackRateChange).toHaveBeenCalledWith(2);
    const updater = updateState.mock.calls[0][0];
    expect(updater({ playbackRate: 1 })).toEqual(expect.objectContaining({ playbackRate: 2 }));
  });

  it('forwards onProgress and updates played/loaded when not seeking', () => {
    const onProgress = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onProgress, updateState, playerState: { seeking: false } }),
    );

    act(() => { result.current.onProgress({ played: 0.5, loaded: 0.8, playedSeconds: 30 }); });

    expect(onProgress).toHaveBeenCalledWith({ played: 0.5, loaded: 0.8, playedSeconds: 30 });
    const updater = updateState.mock.calls[0][0];
    expect(updater({ played: 0, loaded: 0 })).toEqual(expect.objectContaining({ played: 30, loaded: 0.8 }));
  });

  it('forwards onProgress but does NOT update state when seeking', () => {
    const onProgress = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onProgress, updateState, playerState: { seeking: true } }),
    );

    act(() => { result.current.onProgress({ played: 0.5, loaded: 0.8, playedSeconds: 30 }); });

    expect(onProgress).toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });

  it('forwards onSeek and sets seek time', () => {
    const onSeek = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onSeek, updateState }),
    );

    act(() => { result.current.onSeek(45); });

    expect(onSeek).toHaveBeenCalledWith(45);
    const updater = updateState.mock.calls[0][0];
    expect(updater({ seek: 0 })).toEqual(expect.objectContaining({ seek: 45 }));
  });

  it('forwards onStart without state changes', () => {
    const onStart = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onStart, updateState }),
    );

    act(() => { result.current.onStart(); });

    expect(onStart).toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });

  it('forwards onLoaded without state changes', () => {
    const onLoaded = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onLoaded, updateState }),
    );

    act(() => { result.current.onLoaded(); });

    expect(onLoaded).toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });

  it('forwards onMount without state changes', () => {
    const onMount = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onMount, updateState }),
    );

    act(() => { result.current.onMount(); });

    expect(onMount).toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });

  // ---- onReady ----

  it('onReady sets isLoading false', () => {
    const onReady = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onReady, updateState }),
    );

    act(() => { result.current.onReady(); });

    expect(onReady).toHaveBeenCalled();
    const updater = updateState.mock.calls[0][0];
    expect(updater({ isLoading: true })).toEqual(expect.objectContaining({ isLoading: false }));
  });

  // ---- onError classification ----

  it('onError with recoverable error type is ignored (no state update)', () => {
    const onError = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onError, updateState }),
    );

    act(() => {
      result.current.onError('err', { type: 'networkError', details: 'something' });
    });

    expect(onError).toHaveBeenCalled();
    expect(updateState).not.toHaveBeenCalled();
  });

  it('onError with recoverable mediaError detail is ignored', () => {
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, updateState }),
    );

    act(() => {
      result.current.onError('err', { type: 'mediaError', details: 'bufferStalledError' });
    });

    expect(updateState).not.toHaveBeenCalled();
  });

  it('onError with fatal error sets kernelError', () => {
    const onError = jest.fn();
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, onError, updateState }),
    );

    act(() => {
      result.current.onError('err', { type: 'fatalError', error: { message: 'Fatal failure' } });
    });

    expect(onError).toHaveBeenCalled();
    const updater = updateState.mock.calls[0][0];
    const nextState = updater({ kernelError: null, isLoading: true, playing: true });
    expect(nextState.kernelError).toEqual({ type: 'fatalError', detail: 'Fatal failure' });
    expect(nextState.isLoading).toBe(false);
    expect(nextState.playing).toBe(false);
  });

  it('onError with null data sets kernelError to null', () => {
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, updateState }),
    );

    act(() => {
      result.current.onError('err', null);
    });

    const updater = updateState.mock.calls[0][0];
    const nextState = updater({ kernelError: { type: 'old' }, isLoading: true, playing: true });
    expect(nextState.kernelError).toBeNull();
  });

  it('custom recoverableErrorTypes are respected', () => {
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({
        ...baseParams,
        updateState,
        recoverableErrorTypes: ['customRecoverable'],
      }),
    );

    // Custom recoverable type — should be ignored
    act(() => {
      result.current.onError('err', { type: 'customRecoverable' });
    });
    expect(updateState).not.toHaveBeenCalled();

    // Default 'networkError' is no longer recoverable with custom config
    act(() => {
      result.current.onError('err', { type: 'networkError', error: { message: 'x' } });
    });
    expect(updateState).toHaveBeenCalled();
  });

  it('custom recoverableErrorDetails are respected', () => {
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({
        ...baseParams,
        updateState,
        recoverableErrorDetails: ['myCustomDetail'],
      }),
    );

    // Custom recoverable detail — should be ignored
    act(() => {
      result.current.onError('err', { type: 'mediaError', details: 'myCustomDetail' });
    });
    expect(updateState).not.toHaveBeenCalled();

    // Default bufferStalledError is no longer recoverable with custom config
    act(() => {
      result.current.onError('err', { type: 'mediaError', details: 'bufferStalledError', error: { message: 'x' } });
    });
    expect(updateState).toHaveBeenCalled();
  });

  // ---- videoUrl derivation ----

  it('videoUrl derived from extraProps.url', () => {
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, extraProps: { url: 'https://example.com/audio.mp3' } }),
    );

    expect(result.current.videoUrl).toBe('https://example.com/audio.mp3');
  });

  it('videoUrl derived from extraProps.sources[0].src when url is undefined', () => {
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({
        ...baseParams,
        extraProps: { sources: [{ src: 'https://cdn.com/720p.mp4', resolution: 720 }] },
      }),
    );

    expect(result.current.videoUrl).toBe('https://cdn.com/720p.mp4');
  });

  it('videoUrl is null when neither url nor sources are provided', () => {
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ ...baseParams, extraProps: {} }),
    );

    expect(result.current.videoUrl).toBeNull();
  });

  // ---- Callbacks not provided (undefined) ----

  it('does not throw when callbacks are undefined', () => {
    const updateState = jest.fn();
    const { result } = renderHook(() =>
      usePlayerCallbackProxy({ updateState, playerState: { seeking: false }, extraProps: { url: 'x' } }),
    );

    expect(() => {
      act(() => {
        result.current.onBuffer();
        result.current.onBufferEnd();
        result.current.onDuration(10);
        result.current.onEnded();
        result.current.onError('e', null);
        result.current.onPause();
        result.current.onPlay();
        result.current.onPlayBackRateChange(1);
        result.current.onProgress({ played: 0, loaded: 0 });
        result.current.onReady();
        result.current.onSeek(0);
        result.current.onStart();
        result.current.onLoaded();
        result.current.onMount();
      });
    }).not.toThrow();
  });

  // ---- Latest callback is always used ----

  it('uses the latest callback after rerender', () => {
    const firstOnPlay = jest.fn();
    const secondOnPlay = jest.fn();
    const updateState = jest.fn();

    const { result, rerender } = renderHook(
      (props) => usePlayerCallbackProxy(props),
      { initialProps: { ...baseParams, onPlay: firstOnPlay, updateState } },
    );

    rerender({ ...baseParams, onPlay: secondOnPlay, updateState });

    act(() => { result.current.onPlay(); });

    expect(firstOnPlay).not.toHaveBeenCalled();
    expect(secondOnPlay).toHaveBeenCalled();
  });
});
