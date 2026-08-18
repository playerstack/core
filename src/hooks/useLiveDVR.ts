import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sliderPositionToTime, formatLiveOffset } from '@live-dvr';
import type { LiveDVRState } from '@typings/live-dvr.types';
import type { DVRAdapter } from '@typings/adapters.types';
import type { UseLiveDVRParams, UseLiveDVRReturn } from '@typings/hooks/useLiveDVR.types';

export type { UseLiveDVRParams, UseLiveDVRReturn } from '@typings/hooks/useLiveDVR.types';

/** Default DVR configuration. */
const DVR_CONFIG = {
  minDVRWindow: 15,
  liveEdgeTolerance: 10,
};

/**
 * Compute DVR state from adapter data without touching the DOM.
 * Mirrors the logic of `computeLiveDVRState` but using adapter values.
 */
function computeStateFromAdapter(adapter: DVRAdapter): LiveDVRState {
  const range = adapter.getSeekableRange();
  const empty: LiveDVRState = {
    hasDVR: false,
    seekableStart: 0,
    seekableEnd: 0,
    seekableWindow: 0,
    isAtLiveEdge: true,
    liveEdgeOffset: 0,
    sliderDuration: 0,
    sliderPosition: 0,
  };

  if (!range) return empty;

  const { start: seekableStart, end: seekableEnd } = range;
  const seekableWindow = seekableEnd - seekableStart;

  if (seekableWindow < DVR_CONFIG.minDVRWindow || !isFinite(seekableWindow)) {
    return { ...empty, seekableStart, seekableEnd, seekableWindow };
  }

  const currentTime = adapter.getCurrentTime();
  const liveEdgeOffset = currentTime - seekableEnd; // Negative when behind
  const isAtLiveEdge = currentTime >= seekableEnd - DVR_CONFIG.liveEdgeTolerance;

  const sliderPosition = Math.max(0, Math.min(currentTime - seekableStart, seekableWindow));
  const sliderDuration = seekableWindow;

  return {
    hasDVR: true,
    seekableStart,
    seekableEnd,
    seekableWindow,
    isAtLiveEdge,
    liveEdgeOffset,
    sliderDuration,
    sliderPosition,
  };
}

/**
 * React hook for live DVR (time-shifting) functionality using an adapter.
 *
 * Provides reactive state for live stream DVR, including position within
 * the DVR window, live edge detection, formatted offset, and seek actions.
 * All platform I/O flows through the injected DVRAdapter.
 */
export function useLiveDVR({ adapter, liveDVR, playing: _playing }: UseLiveDVRParams): UseLiveDVRReturn {
  const [dvrState, setDvrState] = useState<LiveDVRState | null>(null);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  // Subscribe to adapter time updates when liveDVR is enabled
  useEffect(() => {
    if (!liveDVR || !adapter) {
      setDvrState(null);
      return;
    }

    const update = () => {
      if (adapterRef.current) {
        setDvrState(computeStateFromAdapter(adapterRef.current));
      }
    };

    // Initial computation
    update();

    // Subscribe to time updates
    const cleanup = adapter.onTimeUpdate(update);

    return cleanup;
  }, [liveDVR, adapter]);

  // Seek to live edge
  const seekToLive = useCallback(() => {
    const a = adapterRef.current;
    if (!a) return;
    const range = a.getSeekableRange();
    if (!range) return;
    a.seekTo(range.end);
  }, []);

  // Seek to a DVR slider position (0..sliderDuration)
  const seekToDVRPosition = useCallback(
    (sliderPos: number) => {
      const a = adapterRef.current;
      if (!a || !dvrState) return;
      const time = sliderPositionToTime(sliderPos, dvrState.seekableStart);
      a.seekTo(time);
    },
    [dvrState],
  );

  // Derived values
  const isAtLiveEdge = dvrState?.isAtLiveEdge ?? true;

  const liveOffset = useMemo(
    () => (dvrState ? formatLiveOffset(dvrState.liveEdgeOffset, dvrState.isAtLiveEdge) : ''),
    [dvrState],
  );

  return {
    dvrState,
    isAtLiveEdge,
    liveOffset,
    seekToLive,
    seekToDVRPosition,
  };
}
