/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useAutoHide } from '../../src/hooks/useAutoHide';

describe('useAutoHide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('showControls resets the timer and calls onHidingChange(false)', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange }),
    );

    act(() => {
      result.current.showControls();
    });

    expect(onHidingChange).toHaveBeenCalledWith(false);
  });

  it('after hideDelay, onHidingChange(true) is called', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange, hideDelay: 3000 }),
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('showControls called again resets the timer', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange, hideDelay: 3000 }),
    );

    act(() => {
      result.current.showControls();
    });

    // Advance 2000ms (not enough to fire)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    onHidingChange.mockClear();

    // Reset the timer by calling showControls again
    act(() => {
      result.current.showControls();
    });

    expect(onHidingChange).toHaveBeenCalledWith(false);
    onHidingChange.mockClear();

    // Advance another 2000ms — old timer would have fired at 3000, but reset means it won't
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onHidingChange).not.toHaveBeenCalledWith(true);

    // Advance remaining 1000ms to complete the new 3000ms timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('shouldStayVisible = true prevents auto-hide', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: true, onHidingChange, hideDelay: 3000 }),
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    // Advance well past hideDelay — should NOT fire
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onHidingChange).not.toHaveBeenCalledWith(true);
  });

  it('shouldStayVisible changing to true cancels timer and shows controls', () => {
    const onHidingChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ shouldStayVisible }) => useAutoHide({ shouldStayVisible, onHidingChange, hideDelay: 3000 }),
      { initialProps: { shouldStayVisible: false } },
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    // Change to shouldStayVisible = true
    rerender({ shouldStayVisible: true });

    expect(onHidingChange).toHaveBeenCalledWith(false);
    onHidingChange.mockClear();

    // Advance past hideDelay — should NOT hide
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onHidingChange).not.toHaveBeenCalledWith(true);
  });

  it('shouldStayVisible changing to false restarts timer', () => {
    const onHidingChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ shouldStayVisible }) => useAutoHide({ shouldStayVisible, onHidingChange, hideDelay: 3000 }),
      { initialProps: { shouldStayVisible: true } },
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    // Change to shouldStayVisible = false — should start timer
    rerender({ shouldStayVisible: false });

    onHidingChange.mockClear();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('hideControls immediately hides and cancels timer', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange, hideDelay: 3000 }),
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    act(() => {
      result.current.hideControls();
    });

    expect(onHidingChange).toHaveBeenCalledWith(true);
    onHidingChange.mockClear();

    // Advance past hideDelay — no additional calls since timer was cancelled
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onHidingChange).not.toHaveBeenCalled();
  });

  it('cleanup on unmount clears pending timers', () => {
    const onHidingChange = jest.fn();
    const { result, unmount } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange, hideDelay: 3000 }),
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    unmount();

    // Advance past hideDelay — timer should have been cleaned up
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onHidingChange).not.toHaveBeenCalledWith(true);
  });

  it('uses custom hideDelay', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange, hideDelay: 1000 }),
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    // At 999ms, should not have fired
    act(() => {
      jest.advanceTimersByTime(999);
    });

    expect(onHidingChange).not.toHaveBeenCalled();

    // At 1000ms, should fire
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('defaults hideDelay to 3000ms', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useAutoHide({ shouldStayVisible: false, onHidingChange }),
    );

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    act(() => {
      jest.advanceTimersByTime(2999);
    });

    expect(onHidingChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(onHidingChange).toHaveBeenCalledWith(true);
  });
});
