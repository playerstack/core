import { useCallback, useEffect, useRef } from 'react';
import type { UseAutoHideParams, UseAutoHideReturn } from '../types/hooks/useAutoHide.types';

export type { UseAutoHideParams, UseAutoHideReturn } from '../types/hooks/useAutoHide.types';

const DEFAULT_HIDE_DELAY = 3000;

/**
 * Generic auto-hide hook for player controls.
 * When controls are shown, a timer starts. After `hideDelay` ms the controls hide.
 * If `shouldStayVisible` is true the timer is cancelled and controls stay visible.
 *
 * Uses bare `setTimeout`/`clearTimeout` (no `window.` prefix) for React Native compatibility.
 */
export function useAutoHide({
  shouldStayVisible,
  onHidingChange,
  hideDelay = DEFAULT_HIDE_DELAY,
}: UseAutoHideParams): UseAutoHideReturn {
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
      onHidingChangeRef.current(true);
    }, hideDelay);
  }, [clearTimer, hideDelay]);

  const showControls = useCallback(() => {
    clearTimer();
    onHidingChangeRef.current(false);

    if (shouldStayVisibleRef.current) {
      return;
    }

    startTimer();
  }, [clearTimer, startTimer]);

  const hideControls = useCallback(() => {
    clearTimer();
    onHidingChangeRef.current(true);
  }, [clearTimer]);

  // React to shouldStayVisible changes
  useEffect(() => {
    if (shouldStayVisible) {
      clearTimer();
      onHidingChangeRef.current(false);
    } else {
      startTimer();
    }
  }, [shouldStayVisible, clearTimer, startTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { showControls, hideControls };
}
