import { useCallback, useEffect, useRef } from 'react';
import type { UseVolumeParams, UseVolumeReturn } from '../types/hooks/useVolume.types';

export type { UseVolumeParams, UseVolumeReturn } from '../types/hooks/useVolume.types';

/**
 * Platform-agnostic volume management hook.
 *
 * All platform I/O goes through the injected VolumeAdapter — no browser globals.
 * Preserves volume-before-mute memory and an ignore-own-changes guard to prevent
 * feedback loops when programmatic changes fire the adapter's onVolumeChange callback.
 */
export function useVolume(params: UseVolumeParams): UseVolumeReturn {
  const { adapter, muted, updateState } = params;

  // Track the volume before muting so we can restore it on unmute
  const volumeBeforeMuteRef = useRef(0.8);
  // Guard to ignore volume change events triggered by our own programmatic changes
  const ignoreOwnChangeRef = useRef(false);
  const ignoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest updateState in a ref so the subscription callback is always fresh
  const updateStateRef = useRef(updateState);
  updateStateRef.current = updateState;

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const setIgnoreGuard = useCallback(() => {
    ignoreOwnChangeRef.current = true;
    if (ignoreTimerRef.current !== null) {
      clearTimeout(ignoreTimerRef.current);
    }
    ignoreTimerRef.current = setTimeout(() => {
      ignoreOwnChangeRef.current = false;
      ignoreTimerRef.current = null;
    }, 50);
  }, []);

  const onMutedClick = useCallback(() => {
    const a = adapterRef.current;
    const willMute = !a.getMuted();

    setIgnoreGuard();

    if (willMute) {
      // Muting: remember current volume
      const currentVol = a.getVolume();
      if (currentVol > 0) {
        volumeBeforeMuteRef.current = currentVol;
      }
      a.setMuted(true);
      updateStateRef.current({ volume: currentVol, muted: true });
    } else {
      // Unmuting: restore previous volume
      const restoredVolume = volumeBeforeMuteRef.current || 0.8;
      a.setMuted(false);
      a.setVolume(restoredVolume);
      updateStateRef.current({ volume: restoredVolume, muted: false });
    }
  }, [setIgnoreGuard]);

  const changeVolume = useCallback(
    (v: number) => {
      const a = adapterRef.current;
      let isMuted = v === 0;

      setIgnoreGuard();

      a.setVolume(v);

      // If volume > 0 and currently muted, also unmute
      if (v !== 0 && a.getMuted()) {
        isMuted = false;
        a.setMuted(false);
      }

      // Remember non-zero volume for mute/unmute toggle
      if (v > 0) {
        volumeBeforeMuteRef.current = v;
      }

      updateStateRef.current({ volume: v, muted: isMuted });
    },
    [setIgnoreGuard],
  );

  const updateVolumeWithCallback = useCallback(
    (cb: (lastVolume: number) => number) => {
      const a = adapterRef.current;
      const lastVolume = a.getVolume();
      const newVolume = cb(lastVolume);
      changeVolume(newVolume);
    },
    [changeVolume],
  );

  // Subscribe to external volume changes via adapter
  useEffect(() => {
    const unsubscribe = adapter.onVolumeChange((volume, isMuted) => {
      if (ignoreOwnChangeRef.current) {
        return;
      }
      // Treat volume === 0 as muted
      const effectiveMuted = isMuted || volume === 0;
      updateStateRef.current({ volume, muted: effectiveMuted });
    });

    return unsubscribe;
  }, [adapter]);

  // Sync muted prop to adapter when it changes externally
  useEffect(() => {
    setIgnoreGuard();
    adapter.setMuted(muted);
  }, [muted, adapter, setIgnoreGuard]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (ignoreTimerRef.current !== null) {
        clearTimeout(ignoreTimerRef.current);
      }
    };
  }, []);

  return {
    onMutedClick,
    changeVolume,
    updateVolumeWithCallback,
  };
}
