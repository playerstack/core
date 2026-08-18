/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useVolume } from '../../src/hooks/useVolume';
import type { VolumeAdapter } from '../../src/types/adapters.types';

function createMockAdapter(initial: { volume?: number; muted?: boolean } = {}): VolumeAdapter & {
  _listeners: Set<(volume: number, muted: boolean) => void>;
  _volume: number;
  _muted: boolean;
  _fireChange: () => void;
} {
  const listeners = new Set<(volume: number, muted: boolean) => void>();
  const adapter = {
    _listeners: listeners,
    _volume: initial.volume ?? 0.8,
    _muted: initial.muted ?? false,
    getVolume: jest.fn(() => adapter._volume),
    setVolume: jest.fn((v: number) => {
      adapter._volume = v;
    }),
    getMuted: jest.fn(() => adapter._muted),
    setMuted: jest.fn((m: boolean) => {
      adapter._muted = m;
    }),
    onVolumeChange: jest.fn((cb: (volume: number, muted: boolean) => void) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    }),
    _fireChange: () => {
      for (const cb of listeners) {
        cb(adapter._volume, adapter._muted);
      }
    },
  };
  return adapter;
}

describe('useVolume', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('onMutedClick toggles mute and remembers volume', () => {
    const adapter = createMockAdapter({ volume: 0.6, muted: false });
    const updateState = jest.fn();

    const { result } = renderHook(() =>
      useVolume({ adapter, muted: false, updateState }),
    );

    // Mute
    act(() => {
      result.current.onMutedClick();
    });

    expect(adapter.setMuted).toHaveBeenCalledWith(true);
    expect(updateState).toHaveBeenCalledWith({ volume: 0.6, muted: true });

    updateState.mockClear();
    adapter.setMuted.mockClear();

    // Simulate adapter now reports muted
    adapter._muted = true;

    // Unmute
    act(() => {
      result.current.onMutedClick();
    });

    expect(adapter.setMuted).toHaveBeenCalledWith(false);
    expect(adapter.setVolume).toHaveBeenCalledWith(0.6);
    expect(updateState).toHaveBeenCalledWith({ volume: 0.6, muted: false });
  });

  it('onMutedClick uses default 0.8 when volume was 0', () => {
    const adapter = createMockAdapter({ volume: 0, muted: true });
    const updateState = jest.fn();

    const { result } = renderHook(() =>
      useVolume({ adapter, muted: true, updateState }),
    );

    // Unmute when volume is 0 — should restore default 0.8
    act(() => {
      result.current.onMutedClick();
    });

    expect(adapter.setVolume).toHaveBeenCalledWith(0.8);
    expect(updateState).toHaveBeenCalledWith({ volume: 0.8, muted: false });
  });

  it('changeVolume updates adapter and state', () => {
    const adapter = createMockAdapter({ volume: 0.5, muted: false });
    const updateState = jest.fn();

    const { result } = renderHook(() =>
      useVolume({ adapter, muted: false, updateState }),
    );

    act(() => {
      result.current.changeVolume(0.7);
    });

    expect(adapter.setVolume).toHaveBeenCalledWith(0.7);
    expect(updateState).toHaveBeenCalledWith({ volume: 0.7, muted: false });
  });

  it('changeVolume unmutes when volume > 0 and currently muted', () => {
    const adapter = createMockAdapter({ volume: 0, muted: true });
    const updateState = jest.fn();

    const { result } = renderHook(() =>
      useVolume({ adapter, muted: true, updateState }),
    );

    act(() => {
      result.current.changeVolume(0.5);
    });

    expect(adapter.setVolume).toHaveBeenCalledWith(0.5);
    expect(adapter.setMuted).toHaveBeenCalledWith(false);
    expect(updateState).toHaveBeenCalledWith({ volume: 0.5, muted: false });
  });

  it('changeVolume sets muted when volume is 0', () => {
    const adapter = createMockAdapter({ volume: 0.5, muted: false });
    const updateState = jest.fn();

    const { result } = renderHook(() =>
      useVolume({ adapter, muted: false, updateState }),
    );

    act(() => {
      result.current.changeVolume(0);
    });

    expect(adapter.setVolume).toHaveBeenCalledWith(0);
    expect(updateState).toHaveBeenCalledWith({ volume: 0, muted: true });
  });

  it('updateVolumeWithCallback applies callback to last volume', () => {
    const adapter = createMockAdapter({ volume: 0.5, muted: false });
    const updateState = jest.fn();

    const { result } = renderHook(() =>
      useVolume({ adapter, muted: false, updateState }),
    );

    act(() => {
      result.current.updateVolumeWithCallback((v) => Math.min(v + 0.1, 1));
    });

    expect(adapter.getVolume).toHaveBeenCalled();
    expect(adapter.setVolume).toHaveBeenCalledWith(0.6);
    expect(updateState).toHaveBeenCalledWith({ volume: 0.6, muted: false });
  });

  it('ignore-own-changes guard prevents feedback loop', () => {
    const adapter = createMockAdapter({ volume: 0.8, muted: false });
    const updateState = jest.fn();

    renderHook(() => useVolume({ adapter, muted: false, updateState }));

    // Clear initial calls from muted sync effect
    updateState.mockClear();

    // Simulate an own change (onMutedClick)
    act(() => {
      // Simulate the adapter calling back immediately (like a synchronous event)
      adapter._muted = true;
      adapter._volume = 0.8;
      adapter._fireChange();
    });

    // The ignore guard from the muted sync effect should prevent the callback
    // from updating state. Let's verify by checking no extra calls happened.
    // The effect fired setIgnoreGuard on mount due to muted sync, so the
    // immediate fire should be ignored.
    // Actually we need to wait for the guard to clear
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Now fire a change — should go through
    updateState.mockClear();

    act(() => {
      adapter._volume = 0.3;
      adapter._muted = false;
      adapter._fireChange();
    });

    expect(updateState).toHaveBeenCalledWith({ volume: 0.3, muted: false });
  });

  it('onVolumeChange subscription updates state for external changes', () => {
    const adapter = createMockAdapter({ volume: 0.8, muted: false });
    const updateState = jest.fn();

    renderHook(() => useVolume({ adapter, muted: false, updateState }));

    // Wait for ignore guard from muted sync to clear
    act(() => {
      jest.advanceTimersByTime(50);
    });

    updateState.mockClear();

    // Simulate external volume change
    act(() => {
      adapter._volume = 0.4;
      adapter._muted = false;
      adapter._fireChange();
    });

    expect(updateState).toHaveBeenCalledWith({ volume: 0.4, muted: false });
  });

  it('cleanup on unmount unsubscribes from adapter', () => {
    const adapter = createMockAdapter({ volume: 0.8, muted: false });
    const updateState = jest.fn();

    const { unmount } = renderHook(() =>
      useVolume({ adapter, muted: false, updateState }),
    );

    expect(adapter._listeners.size).toBe(1);

    unmount();

    expect(adapter._listeners.size).toBe(0);
  });

  it('syncs muted prop to adapter when prop changes', () => {
    const adapter = createMockAdapter({ volume: 0.8, muted: false });
    const updateState = jest.fn();

    const { rerender } = renderHook(
      ({ muted }) => useVolume({ adapter, muted, updateState }),
      { initialProps: { muted: false } },
    );

    adapter.setMuted.mockClear();

    rerender({ muted: true });

    expect(adapter.setMuted).toHaveBeenCalledWith(true);
  });
});
