/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useLiveDVR } from '../../src/hooks/useLiveDVR';
import type { DVRAdapter } from '../../src/types/adapters.types';

function createMockAdapter(options: {
  seekableRange?: { start: number; end: number } | null;
  currentTime?: number;
} = {}): DVRAdapter & {
  _listeners: Set<() => void>;
  _seekableRange: { start: number; end: number } | null;
  _currentTime: number;
  _fire: () => void;
} {
  const listeners = new Set<() => void>();
  const adapter = {
    _listeners: listeners,
    _seekableRange: options.seekableRange ?? { start: 0, end: 120 },
    _currentTime: options.currentTime ?? 115,
    getSeekableRange: jest.fn(() => adapter._seekableRange),
    getCurrentTime: jest.fn(() => adapter._currentTime),
    seekTo: jest.fn((time: number) => {
      adapter._currentTime = time;
    }),
    onTimeUpdate: jest.fn((cb: () => void) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    }),
    _fire: () => {
      for (const cb of listeners) {
        cb();
      }
    },
  };
  return adapter;
}

describe('useLiveDVR', () => {
  it('returns null dvrState when liveDVR is false', () => {
    const adapter = createMockAdapter();

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: false, playing: true }),
    );

    expect(result.current.dvrState).toBeNull();
    expect(result.current.isAtLiveEdge).toBe(true);
    expect(result.current.liveOffset).toBe('');
  });

  it('returns null dvrState when adapter is null', () => {
    const { result } = renderHook(() =>
      useLiveDVR({ adapter: null, liveDVR: true, playing: true }),
    );

    expect(result.current.dvrState).toBeNull();
    expect(result.current.isAtLiveEdge).toBe(true);
    expect(result.current.liveOffset).toBe('');
  });

  it('computes correct DVR state when adapter provides data', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 100, end: 200 },
      currentTime: 150,
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    expect(result.current.dvrState).not.toBeNull();
    expect(result.current.dvrState!.hasDVR).toBe(true);
    expect(result.current.dvrState!.seekableStart).toBe(100);
    expect(result.current.dvrState!.seekableEnd).toBe(200);
    expect(result.current.dvrState!.seekableWindow).toBe(100);
    expect(result.current.dvrState!.sliderPosition).toBe(50);
    expect(result.current.dvrState!.sliderDuration).toBe(100);
    expect(result.current.dvrState!.liveEdgeOffset).toBe(-50);
    expect(result.current.dvrState!.isAtLiveEdge).toBe(false);
  });

  it('isAtLiveEdge is true when near live edge', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 0, end: 120 },
      currentTime: 115, // within 10s tolerance
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    expect(result.current.isAtLiveEdge).toBe(true);
    expect(result.current.liveOffset).toBe('');
  });

  it('shows formatted offset when not at live edge', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 0, end: 120 },
      currentTime: 40, // 80s behind
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    expect(result.current.isAtLiveEdge).toBe(false);
    expect(result.current.liveOffset).toBe('-1:20');
  });

  it('seekToLive calls adapter.seekTo with end of range', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 0, end: 200 },
      currentTime: 100,
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    act(() => {
      result.current.seekToLive();
    });

    expect(adapter.seekTo).toHaveBeenCalledWith(200);
  });

  it('seekToDVRPosition computes correct time from slider position', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 100, end: 200 },
      currentTime: 150,
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    act(() => {
      result.current.seekToDVRPosition(75); // 75 within 0..100 slider
    });

    // sliderPositionToTime(75, 100) = 175
    expect(adapter.seekTo).toHaveBeenCalledWith(175);
  });

  it('updates state when adapter fires time update', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 0, end: 120 },
      currentTime: 115,
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    expect(result.current.isAtLiveEdge).toBe(true);

    // Simulate time progressing backward (user seeks back)
    act(() => {
      adapter._currentTime = 30;
      adapter._fire();
    });

    expect(result.current.isAtLiveEdge).toBe(false);
    expect(result.current.dvrState!.sliderPosition).toBe(30);
  });

  it('cleans up subscription on unmount', () => {
    const adapter = createMockAdapter();

    const { unmount } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    expect(adapter._listeners.size).toBe(1);

    unmount();

    expect(adapter._listeners.size).toBe(0);
  });

  it('cleans up and returns null when liveDVR transitions to false', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 0, end: 120 },
      currentTime: 60,
    });

    const { result, rerender } = renderHook(
      ({ liveDVR }) => useLiveDVR({ adapter, liveDVR, playing: true }),
      { initialProps: { liveDVR: true } },
    );

    expect(result.current.dvrState).not.toBeNull();

    rerender({ liveDVR: false });

    expect(result.current.dvrState).toBeNull();
    expect(adapter._listeners.size).toBe(0);
  });

  it('returns hasDVR false when seekable window is too small', () => {
    const adapter = createMockAdapter({
      seekableRange: { start: 0, end: 10 }, // < 15s minDVRWindow
      currentTime: 5,
    });

    const { result } = renderHook(() =>
      useLiveDVR({ adapter, liveDVR: true, playing: true }),
    );

    expect(result.current.dvrState).not.toBeNull();
    expect(result.current.dvrState!.hasDVR).toBe(false);
  });
});
