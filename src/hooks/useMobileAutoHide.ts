import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseMobileAutoHideParams, UseMobileAutoHideReturn } from '@typings/hooks/useMobileAutoHide.types';

export type { UseMobileAutoHideParams, UseMobileAutoHideReturn } from '@typings/hooks/useMobileAutoHide.types';

const DEFAULT_HIDE_DELAY = 3000;

/**
 * Generic mobile auto-hide hook for player controls.
 * Mobile controls are toggled via tap (show/hide) rather than auto-shown on mouse movement.
 * When controls are shown, a timer starts. After `hideDelay` ms the controls hide.
 * If `shouldStayVisible` is true the timer is cancelled and controls stay visible.
 *
 * Uses bare `setTimeout`/`clearTimeout` (no `window.` prefix) for React Native compatibility.
 */
export function useMobileAutoHide({
  shouldStayVisible,
  onHidingChange,
  hideDelay = DEFAULT_HIDE_DELAY,
}: UseMobileAutoHideParams): UseMobileAutoHideReturn {
  const [controlsVisible, setControlsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest callback in a ref so that memoized functions always call current version
  const onHidingChangeRef = useRef(onHidingChange);
  onHidingChangeRef.current = onHidingChange;

  const shouldStayVisibleRef = useRef(shouldStayVisible);
  shouldStayVisibleRef.current = shouldStayVisible;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setControlsVisible(false);
      onHidingChangeRef.current(true);
    }, hideDelay);
  }, [clearTimer, hideDelay]);

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => {
      const next = !prev;
      if (next) {
        // Showing controls
        onHidingChangeRef.current(false);
        if (!shouldStayVisibleRef.current) {
          // Need to start timer outside setState, schedule it
          clearTimer();
          timerRef.current = setTimeout(() => {
            setControlsVisible(false);
            onHidingChangeRef.current(true);
          }, hideDelay);
        }
      } else {
        // Hiding controls
        clearTimer();
        onHidingChangeRef.current(true);
      }
      return next;
    });
  }, [clearTimer, hideDelay]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    onHidingChangeRef.current(false);
    clearTimer();

    if (!shouldStayVisibleRef.current) {
      startTimer();
    }
  }, [clearTimer, startTimer]);

  const hideControls = useCallback(() => {
    setControlsVisible(false);
    clearTimer();
    onHidingChangeRef.current(true);
  }, [clearTimer]);

  // React to shouldStayVisible changes
  const controlsVisibleRef = useRef(controlsVisible);
  controlsVisibleRef.current = controlsVisible;

  useEffect(() => {
    if (shouldStayVisible) {
      setControlsVisible(true);
      clearTimer();
      onHidingChangeRef.current(false);
    } else if (controlsVisibleRef.current) {
      startTimer();
    }
  }, [shouldStayVisible, clearTimer, startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { controlsVisible, toggleControls, showControls, hideControls };
}
