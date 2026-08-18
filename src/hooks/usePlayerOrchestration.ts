import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  UsePlayerOrchestrationParams,
  UsePlayerOrchestrationReturn,
} from '../types/hooks/usePlayerOrchestration.types';

export type {
  QualitySwitchConfig,
  UsePlayerOrchestrationParams,
  UsePlayerOrchestrationReturn,
} from '../types/hooks/usePlayerOrchestration.types';

// ---------- Constants ----------

const DEFAULT_PROGRESS_INTERVAL = 1000;
const SEEK_ON_PLAY_EXPIRY = 5000;
const DURATION_CHECK_INTERVAL = 100;
const DURATION_CHECK_MAX_RETRIES = 10;

// ---------- Hook ----------

/**
 * Encapsulates the "PlayerProxy" orchestration logic — the lifecycle management
 * that coordinates between the player adapter and the component state.
 *
 * All player interaction goes through the injected PlayerAdapter.
 * No browser globals are used — timers use bare setTimeout/setInterval.
 *
 * The hook manages:
 * - Progress polling loop (polls adapter for currentTime/loaded at interval)
 * - Duration check retry (retries getDuration if null after load)
 * - Play/pause sync (calls adapter.play/pause when `playing` prop changes)
 * - Volume/mute sync (syncs volume and muted to adapter)
 * - Playback rate sync
 * - Load: when `url` changes, calls adapter.load()
 * - Seek-on-play: queues a seek for when play starts if player isn't ready
 * - Stop on unmount
 * - Loop: on ended, seeks to 0 and plays if loop is true
 * - Quality switch (optional): reload-at-position flow
 *
 * The consumer must wire adapter lifecycle events (ready, play, pause, ended, error)
 * to this hook by calling the returned notify methods. These internal handlers
 * coordinate the orchestration state machine.
 */
export function usePlayerOrchestration(params: UsePlayerOrchestrationParams): UsePlayerOrchestrationReturn {
  const {
    adapter,
    playing,
    muted,
    volume,
    playbackRate,
    loop,
    url,
    progressInterval = DEFAULT_PROGRESS_INTERVAL,
    stopOnUnmount = true,
    onProgress,
    onDuration,
    onReady,
    onPlay,
    onPause,
    onEnded,
    onError,
    onSeek,
    qualitySwitch,
  } = params;

  // ---------- State ----------
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ---------- Refs ----------
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const mountedRef = useRef(true);
  const isReadyRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isLoadingRef = useRef(true);
  const startOnPlayRef = useRef(true);
  const onDurationCalledRef = useRef(false);
  const isSwitchingQualityRef = useRef(false);

  // Seek-on-play: store a pending seek position to apply when play starts
  const seekOnPlayRef = useRef<number | null>(null);
  const seekOnPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load deferral: if URL changes while loading, defer until ready
  const loadOnReadyRef = useRef<string | null>(null);

  // Timer refs
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Previous values for change detection
  const prevPlayedRef = useRef(0);
  const prevLoadedRef = useRef<number | null>(0);
  const prevUrlRef = useRef<string | null>(url);
  const prevPlayingRef = useRef(playing);
  const prevMutedRef = useRef(muted);
  const prevVolumeRef = useRef(volume);
  const prevPlaybackRateRef = useRef(playbackRate);
  const prevQualityRef = useRef<number | null>(qualitySwitch?.currentQuality ?? null);

  // Callback refs (always read latest)
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onDurationRef = useRef(onDuration);
  onDurationRef.current = onDuration;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const progressIntervalRef = useRef(progressInterval);
  progressIntervalRef.current = progressInterval;

  // ---------- Progress polling ----------

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    progressTimerRef.current = setInterval(() => {
      if (!mountedRef.current || !isPlayingRef.current) {
        return;
      }
      const a = adapterRef.current;
      const currentTime = a.getCurrentTime();
      const secondsLoaded = a.getSecondsLoaded();
      const duration = a.getDuration();

      if (duration && currentTime !== null) {
        const played = currentTime / duration;
        const loaded = secondsLoaded !== null ? secondsLoaded / duration : 0;

        if (currentTime !== prevPlayedRef.current || secondsLoaded !== prevLoadedRef.current) {
          if (onProgressRef.current) {
            onProgressRef.current({ played, loaded });
          }
          prevPlayedRef.current = currentTime;
          if (secondsLoaded !== null) {
            prevLoadedRef.current = secondsLoaded;
          }
        }
      }
    }, progressIntervalRef.current);
  }, [stopProgress]);

  // ---------- Duration check retry ----------

  const handleDurationCheck = useCallback(() => {
    if (durationCheckTimerRef.current !== null) {
      clearTimeout(durationCheckTimerRef.current);
      durationCheckTimerRef.current = null;
    }

    let retries = 0;

    const check = () => {
      if (!mountedRef.current) return;

      const duration = adapterRef.current.getDuration();
      if (duration !== null && duration > 0) {
        if (!onDurationCalledRef.current && onDurationRef.current) {
          onDurationRef.current(duration);
          onDurationCalledRef.current = true;
        }
      } else if (retries < DURATION_CHECK_MAX_RETRIES) {
        retries++;
        durationCheckTimerRef.current = setTimeout(check, DURATION_CHECK_INTERVAL);
      }
    };

    check();
  }, []);

  // ---------- seekTo ----------

  const seekTo = useCallback((seconds: number, keepPlaying?: boolean) => {
    if (!isReadyRef.current) {
      // Queue the seek for when play starts
      if (seconds !== 0) {
        seekOnPlayRef.current = seconds;
        if (seekOnPlayTimerRef.current !== null) {
          clearTimeout(seekOnPlayTimerRef.current);
        }
        seekOnPlayTimerRef.current = setTimeout(() => {
          seekOnPlayRef.current = null;
          seekOnPlayTimerRef.current = null;
        }, SEEK_ON_PLAY_EXPIRY);
      }
      return;
    }
    adapterRef.current.seekTo(seconds, keepPlaying);
    if (onSeekRef.current) {
      onSeekRef.current(seconds);
    }
  }, []);

  // ---------- URL change effect (load) ----------

  useEffect(() => {
    if (prevUrlRef.current === url) return;
    prevUrlRef.current = url;

    if (!url) return;

    // Stop any existing progress loop
    stopProgress();

    if (isLoadingRef.current && !isReadyRef.current) {
      // Defer load until player is ready
      loadOnReadyRef.current = url;
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    startOnPlayRef.current = true;
    onDurationCalledRef.current = false;

    // If quality switch triggered the URL change, remember position
    if (isSwitchingQualityRef.current) {
      const currentTime = adapterRef.current.getCurrentTime();
      if (currentTime !== null && currentTime > 0) {
        seekOnPlayRef.current = currentTime;
      }
    }

    adapterRef.current.load(url, isReadyRef.current);
  }, [url, stopProgress]);

  // ---------- Play/pause sync ----------

  useEffect(() => {
    if (prevPlayingRef.current === playing) return;
    prevPlayingRef.current = playing;

    if (!isReadyRef.current) return;

    if (playing && !isPlayingRef.current) {
      adapterRef.current.play();
    } else if (!playing && isPlayingRef.current) {
      adapterRef.current.pause();
    }
  }, [playing]);

  // ---------- Volume sync ----------

  useEffect(() => {
    if (prevVolumeRef.current === volume) return;
    prevVolumeRef.current = volume;

    if (!isReadyRef.current) return;

    adapterRef.current.setVolume(volume);
  }, [volume]);

  // ---------- Mute sync ----------

  useEffect(() => {
    if (prevMutedRef.current === muted) return;
    prevMutedRef.current = muted;

    if (!isReadyRef.current) return;

    if (muted) {
      adapterRef.current.mute();
    } else {
      adapterRef.current.unmute();
      // Set volume on next tick after unmuting (fixes some player bugs)
      if (volumeTimerRef.current !== null) {
        clearTimeout(volumeTimerRef.current);
      }
      volumeTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          adapterRef.current.setVolume(volumeRef.current);
        }
        volumeTimerRef.current = null;
      }, 0);
    }
  }, [muted]);

  // ---------- Playback rate sync ----------

  useEffect(() => {
    if (prevPlaybackRateRef.current === playbackRate) return;
    prevPlaybackRateRef.current = playbackRate;

    if (!isReadyRef.current) return;

    adapterRef.current.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  // ---------- Quality switch handling ----------

  useEffect(() => {
    if (!qualitySwitch?.enabled) return;

    const currentQuality = qualitySwitch.currentQuality;
    if (prevQualityRef.current === currentQuality) return;
    prevQualityRef.current = currentQuality;

    if (currentQuality === null || !isReadyRef.current) return;

    // Remember current position for seek after reload
    const currentTime = adapterRef.current.getCurrentTime();
    if (currentTime !== null && currentTime > 0) {
      seekOnPlayRef.current = currentTime;
    }
    isSwitchingQualityRef.current = true;

    if (qualitySwitch.onQualityChange) {
      qualitySwitch.onQualityChange(currentQuality);
    }
  }, [qualitySwitch?.enabled, qualitySwitch?.currentQuality, qualitySwitch?.onQualityChange]);

  // ---------- Adapter event handlers (called by external wiring) ----------

  // These are exposed via a stable ref-based object. The consumer (or a thin wrapper
  // component) wires the adapter/player events to call these.

  const handleReady = useCallback(() => {
    if (!mountedRef.current) return;

    isReadyRef.current = true;
    isLoadingRef.current = false;
    setIsReady(true);
    setIsLoading(false);

    if (onReadyRef.current) {
      onReadyRef.current();
    }

    // Sync volume on ready
    if (!mutedRef.current) {
      adapterRef.current.setVolume(volumeRef.current);
    }

    // Handle deferred load
    if (loadOnReadyRef.current) {
      adapterRef.current.load(loadOnReadyRef.current, true);
      loadOnReadyRef.current = null;
    } else if (playingRef.current || isSwitchingQualityRef.current) {
      adapterRef.current.play();
    }

    handleDurationCheck();
  }, [handleDurationCheck]);

  const handlePlay = useCallback(() => {
    isPlayingRef.current = true;
    isLoadingRef.current = false;
    setIsLoading(false);
    isSwitchingQualityRef.current = false;

    if (startOnPlayRef.current) {
      if (playbackRateRef.current !== 1) {
        adapterRef.current.setPlaybackRate(playbackRateRef.current);
      }
      startOnPlayRef.current = false;
    }

    if (onPlayRef.current) {
      onPlayRef.current();
    }

    // Apply pending seek-on-play
    if (seekOnPlayRef.current !== null) {
      adapterRef.current.seekTo(seekOnPlayRef.current);
      seekOnPlayRef.current = null;
      if (seekOnPlayTimerRef.current !== null) {
        clearTimeout(seekOnPlayTimerRef.current);
        seekOnPlayTimerRef.current = null;
      }
    }

    handleDurationCheck();
    startProgress();
  }, [handleDurationCheck, startProgress]);

  const handlePause = useCallback(() => {
    isPlayingRef.current = false;
    stopProgress();

    if (!isLoadingRef.current && !isSwitchingQualityRef.current) {
      if (onPauseRef.current) {
        onPauseRef.current();
      }
    }
  }, [stopProgress]);

  const handleEnded = useCallback(() => {
    if (loopRef.current) {
      // Seek back to 0 and continue playing
      adapterRef.current.seekTo(0);
      adapterRef.current.play();
      return;
    }

    isPlayingRef.current = false;
    stopProgress();

    if (onEndedRef.current) {
      onEndedRef.current();
    }
  }, [stopProgress]);

  const handleError = useCallback((error: any) => {
    isLoadingRef.current = false;
    setIsLoading(false);
    if (onErrorRef.current) {
      onErrorRef.current(error);
    }
  }, []);

  // ---------- Store handlers in a stable ref for the notify object ----------
  const notifyRef = useRef({
    onReady: handleReady,
    onPlay: handlePlay,
    onPause: handlePause,
    onEnded: handleEnded,
    onError: handleError,
  });
  notifyRef.current.onReady = handleReady;
  notifyRef.current.onPlay = handlePlay;
  notifyRef.current.onPause = handlePause;
  notifyRef.current.onEnded = handleEnded;
  notifyRef.current.onError = handleError;

  // ---------- Initial load on mount ----------

  useEffect(() => {
    if (url) {
      adapterRef.current.load(url);
    }

    return () => {
      // Cleanup: mark unmounted, stop timers, stop player
      mountedRef.current = false;
      stopProgress();

      if (durationCheckTimerRef.current !== null) {
        clearTimeout(durationCheckTimerRef.current);
      }
      if (seekOnPlayTimerRef.current !== null) {
        clearTimeout(seekOnPlayTimerRef.current);
      }
      if (volumeTimerRef.current !== null) {
        clearTimeout(volumeTimerRef.current);
      }

      if (stopOnUnmount) {
        adapterRef.current.stop();
      }
    };
    // Only run on mount/unmount
  }, []);

  return {
    isReady,
    isLoading,
    seekTo,
    // Internal notification interface for adapter events — the consuming component
    // wires player lifecycle events to these handlers.
    _notify: notifyRef.current,
  } as unknown as UsePlayerOrchestrationReturn;
}
