import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseDoubleTapSkipParams, SkipState, UseDoubleTapSkipReturn } from '@typings/hooks/useDoubleTapSkip.types';

export type { UseDoubleTapSkipParams, SkipState, UseDoubleTapSkipReturn } from '@typings/hooks/useDoubleTapSkip.types';

const DEFAULT_SKIP_SECONDS = 10;
const DEFAULT_DOUBLE_TAP_DELAY = 300;
const DEFAULT_DISPLAY_DURATION = 1000;

/**
 * Hook for double-tap skip forward/backward behavior on mobile.
 * Double-tapping the left half rewinds, right half fast-forwards.
 *
 * Uses bare `setTimeout`/`clearTimeout` (no `window.` prefix) for React Native compatibility.
 */
export function useDoubleTapSkip({
  currentTime,
  duration,
  changeCurrentTime,
  showControls,
  skipSeconds = DEFAULT_SKIP_SECONDS,
  doubleTapDelay = DEFAULT_DOUBLE_TAP_DELAY,
  displayDuration = DEFAULT_DISPLAY_DURATION,
}: UseDoubleTapSkipParams): UseDoubleTapSkipReturn {
  const [skipState, setSkipState] = useState<SkipState>({ direction: null, visible: false, seconds: 0 });

  const tapTimerLeft = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerRight = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountLeft = useRef(0);
  const tapCountRight = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs to always read fresh values inside callbacks without re-creating them
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const doSkip = useCallback(
    (direction: 'forward' | 'backward') => {
      const dur = durationRef.current;
      const time = currentTimeRef.current;
      if (isNaN(dur) || dur <= 0) return;
      const delta = direction === 'forward' ? skipSeconds : -skipSeconds;
      const newTime = Math.max(0, Math.min(dur, time + delta));
      changeCurrentTime(newTime);

      setSkipState((prev) => ({
        direction,
        visible: true,
        seconds: prev.direction === direction && prev.visible ? prev.seconds + skipSeconds : skipSeconds,
      }));

      if (hideTimer.current !== null) {
        clearTimeout(hideTimer.current);
      }
      hideTimer.current = setTimeout(() => {
        setSkipState({ direction: null, visible: false, seconds: 0 });
      }, displayDuration);
    },
    [changeCurrentTime, skipSeconds, displayDuration],
  );

  const handleTapLeft = useCallback(() => {
    tapCountLeft.current += 1;
    if (tapCountLeft.current === 1) {
      tapTimerLeft.current = setTimeout(() => {
        tapCountLeft.current = 0;
        if (showControls) showControls();
      }, doubleTapDelay);
    } else {
      if (tapTimerLeft.current !== null) {
        clearTimeout(tapTimerLeft.current);
      }
      tapCountLeft.current = 0;
      doSkip('backward');
    }
  }, [doSkip, showControls, doubleTapDelay]);

  const handleTapRight = useCallback(() => {
    tapCountRight.current += 1;
    if (tapCountRight.current === 1) {
      tapTimerRight.current = setTimeout(() => {
        tapCountRight.current = 0;
        if (showControls) showControls();
      }, doubleTapDelay);
    } else {
      if (tapTimerRight.current !== null) {
        clearTimeout(tapTimerRight.current);
      }
      tapCountRight.current = 0;
      doSkip('forward');
    }
  }, [doSkip, showControls, doubleTapDelay]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      if (tapTimerLeft.current !== null) clearTimeout(tapTimerLeft.current);
      if (tapTimerRight.current !== null) clearTimeout(tapTimerRight.current);
      if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    };
  }, []);

  return { skipState, handleTapLeft, handleTapRight };
}
