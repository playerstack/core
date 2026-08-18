/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDoubleTapSkip } from '@hooks/useDoubleTapSkip';

describe('useDoubleTapSkip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultParams = {
    currentTime: 30,
    duration: 120,
    changeCurrentTime: jest.fn(),
    showControls: jest.fn(),
  };

  it('double tap left triggers backward skip', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, changeCurrentTime }),
    );

    act(() => {
      result.current.handleTapLeft();
    });
    act(() => {
      result.current.handleTapLeft();
    });

    expect(changeCurrentTime).toHaveBeenCalledWith(20); // 30 - 10
    expect(result.current.skipState.direction).toBe('backward');
    expect(result.current.skipState.visible).toBe(true);
    expect(result.current.skipState.seconds).toBe(10);
  });

  it('double tap right triggers forward skip', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, changeCurrentTime }),
    );

    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(changeCurrentTime).toHaveBeenCalledWith(40); // 30 + 10
    expect(result.current.skipState.direction).toBe('forward');
    expect(result.current.skipState.visible).toBe(true);
    expect(result.current.skipState.seconds).toBe(10);
  });

  it('single tap does not trigger skip (calls showControls after delay)', () => {
    const changeCurrentTime = jest.fn();
    const showControls = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, changeCurrentTime, showControls }),
    );

    act(() => {
      result.current.handleTapLeft();
    });

    // Before delay elapses, no skip and no showControls
    expect(changeCurrentTime).not.toHaveBeenCalled();
    expect(showControls).not.toHaveBeenCalled();

    // After delay, showControls is called
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(changeCurrentTime).not.toHaveBeenCalled();
    expect(showControls).toHaveBeenCalledTimes(1);
    expect(result.current.skipState.direction).toBeNull();
    expect(result.current.skipState.visible).toBe(false);
  });

  it('skip state becomes visible then auto-hides after displayDuration', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, changeCurrentTime }),
    );

    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(result.current.skipState.visible).toBe(true);

    // After displayDuration (1000ms), skip state should hide
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.skipState.visible).toBe(false);
    expect(result.current.skipState.direction).toBeNull();
    expect(result.current.skipState.seconds).toBe(0);
  });

  it('respects lower boundary (cannot go below 0)', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, currentTime: 3, changeCurrentTime }),
    );

    act(() => {
      result.current.handleTapLeft();
    });
    act(() => {
      result.current.handleTapLeft();
    });

    // 3 - 10 = -7, clamped to 0
    expect(changeCurrentTime).toHaveBeenCalledWith(0);
  });

  it('respects upper boundary (cannot go above duration)', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, currentTime: 115, duration: 120, changeCurrentTime }),
    );

    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    // 115 + 10 = 125, clamped to 120
    expect(changeCurrentTime).toHaveBeenCalledWith(120);
  });

  it('accumulates seconds on multiple rapid taps in same direction', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, currentTime: 50, changeCurrentTime }),
    );

    // First double tap
    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(result.current.skipState.seconds).toBe(10);

    // Third tap starts a new single-tap counter, fourth tap triggers skip again
    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(result.current.skipState.seconds).toBe(20);
    expect(result.current.skipState.direction).toBe('forward');
  });

  it('does not skip when duration is 0 or NaN', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, duration: 0, changeCurrentTime }),
    );

    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(changeCurrentTime).not.toHaveBeenCalled();
  });

  it('uses custom skipSeconds', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, changeCurrentTime, skipSeconds: 15 }),
    );

    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(changeCurrentTime).toHaveBeenCalledWith(45); // 30 + 15
    expect(result.current.skipState.seconds).toBe(15);
  });

  it('uses custom doubleTapDelay', () => {
    const showControls = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, showControls, doubleTapDelay: 500 }),
    );

    act(() => {
      result.current.handleTapLeft();
    });

    // At 300ms (default delay), showControls should NOT have been called
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(showControls).not.toHaveBeenCalled();

    // At 500ms, showControls should be called
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(showControls).toHaveBeenCalledTimes(1);
  });

  it('uses custom displayDuration', () => {
    const changeCurrentTime = jest.fn();
    const { result } = renderHook(() =>
      useDoubleTapSkip({ ...defaultParams, changeCurrentTime, displayDuration: 2000 }),
    );

    act(() => {
      result.current.handleTapRight();
    });
    act(() => {
      result.current.handleTapRight();
    });

    expect(result.current.skipState.visible).toBe(true);

    // At 1000ms (default), should still be visible
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.skipState.visible).toBe(true);

    // At 2000ms, should hide
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.skipState.visible).toBe(false);
  });
});
