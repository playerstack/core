/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useMobileAutoHide } from '../../src/hooks/useMobileAutoHide';

describe('useMobileAutoHide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('toggleControls hides when visible, shows when hidden', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useMobileAutoHide({ shouldStayVisible: true, onHidingChange }),
    );

    // Initially visible
    expect(result.current.controlsVisible).toBe(true);

    // Toggle → hide
    act(() => {
      result.current.toggleControls();
    });
    expect(result.current.controlsVisible).toBe(false);
    expect(onHidingChange).toHaveBeenCalledWith(true);

    onHidingChange.mockClear();

    // Toggle → show
    act(() => {
      result.current.toggleControls();
    });
    expect(result.current.controlsVisible).toBe(true);
    expect(onHidingChange).toHaveBeenCalledWith(false);
  });

  it('auto-hide timer fires after hideDelay (default 3000ms)', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useMobileAutoHide({ shouldStayVisible: false, onHidingChange }),
    );

    // Controls start visible; hide them first
    act(() => {
      result.current.toggleControls();
    });
    expect(result.current.controlsVisible).toBe(false);

    onHidingChange.mockClear();

    // Toggle to show — starts auto-hide timer
    act(() => {
      result.current.toggleControls();
    });
    expect(result.current.controlsVisible).toBe(true);

    onHidingChange.mockClear();

    // Advance just before the delay
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(result.current.controlsVisible).toBe(true);

    // Advance to the delay
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.controlsVisible).toBe(false);
    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('shouldStayVisible prevents auto-hide', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useMobileAutoHide({ shouldStayVisible: true, onHidingChange }),
    );

    expect(result.current.controlsVisible).toBe(true);

    // Even after a long time, controls stay visible
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.controlsVisible).toBe(true);
  });

  it('shouldStayVisible changing to true cancels timer and shows controls', () => {
    const onHidingChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ shouldStayVisible }) =>
        useMobileAutoHide({ shouldStayVisible, onHidingChange }),
      { initialProps: { shouldStayVisible: false } },
    );

    // Wait some time (timer is running since initial shouldStayVisible=false and controls visible)
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    onHidingChange.mockClear();

    // Change to shouldStayVisible = true
    rerender({ shouldStayVisible: true });

    expect(result.current.controlsVisible).toBe(true);
    expect(onHidingChange).toHaveBeenCalledWith(false);
    onHidingChange.mockClear();

    // Advance well past hideDelay — should NOT hide
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.controlsVisible).toBe(true);
    expect(onHidingChange).not.toHaveBeenCalledWith(true);
  });

  it('shouldStayVisible changing to false restarts timer', () => {
    const onHidingChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ shouldStayVisible }) =>
        useMobileAutoHide({ shouldStayVisible, onHidingChange }),
      { initialProps: { shouldStayVisible: true } },
    );

    expect(result.current.controlsVisible).toBe(true);

    onHidingChange.mockClear();

    // Change to shouldStayVisible = false — should start timer
    rerender({ shouldStayVisible: false });

    // Advance to hideDelay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.controlsVisible).toBe(false);
    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('showControls makes controls visible and starts timer', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useMobileAutoHide({ shouldStayVisible: false, onHidingChange }),
    );

    // Hide first
    act(() => {
      result.current.hideControls();
    });
    expect(result.current.controlsVisible).toBe(false);

    onHidingChange.mockClear();

    // showControls
    act(() => {
      result.current.showControls();
    });
    expect(result.current.controlsVisible).toBe(true);
    expect(onHidingChange).toHaveBeenCalledWith(false);

    onHidingChange.mockClear();

    // Timer fires after hideDelay
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.controlsVisible).toBe(false);
    expect(onHidingChange).toHaveBeenCalledWith(true);
  });

  it('hideControls immediately hides', () => {
    const onHidingChange = jest.fn();
    const { result } = renderHook(() =>
      useMobileAutoHide({ shouldStayVisible: false, onHidingChange }),
    );

    expect(result.current.controlsVisible).toBe(true);

    onHidingChange.mockClear();

    act(() => {
      result.current.hideControls();
    });
    expect(result.current.controlsVisible).toBe(false);
    expect(onHidingChange).toHaveBeenCalledWith(true);

    onHidingChange.mockClear();

    // No timer fires afterwards
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onHidingChange).not.toHaveBeenCalled();
  });

  it('cleanup on unmount clears pending timers', () => {
    const onHidingChange = jest.fn();
    const { result, unmount } = renderHook(() =>
      useMobileAutoHide({ shouldStayVisible: false, onHidingChange }),
    );

    // Show controls to start the auto-hide timer
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
      useMobileAutoHide({ shouldStayVisible: false, onHidingChange, hideDelay: 1500 }),
    );

    // Hide first, then show to start a fresh timer
    act(() => {
      result.current.hideControls();
    });

    onHidingChange.mockClear();

    act(() => {
      result.current.showControls();
    });

    onHidingChange.mockClear();

    // At 1499ms, should not have fired
    act(() => {
      jest.advanceTimersByTime(1499);
    });
    expect(result.current.controlsVisible).toBe(true);

    // At 1500ms, should fire
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.controlsVisible).toBe(false);
    expect(onHidingChange).toHaveBeenCalledWith(true);
  });
});
