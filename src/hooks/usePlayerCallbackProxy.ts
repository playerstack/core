import { useRef, useMemo } from 'react';
import type {
  UsePlayerCallbackProxyParams,
  UsePlayerCallbackProxyReturn,
} from '@typings/hooks/usePlayerCallbackProxy.types';

export type {
  UsePlayerCallbackProxyParams,
  UsePlayerCallbackProxyReturn,
} from '@typings/hooks/usePlayerCallbackProxy.types';

// ---------- Defaults ----------

const DEFAULT_RECOVERABLE_ERROR_TYPES = ['networkError'];
const DEFAULT_RECOVERABLE_ERROR_DETAILS = [
  'bufferStalledError',
  'bufferNudgeOnStall',
  'bufferAppendError',
  'fragParsingError',
];

// ---------- Hook ----------

/**
 * Creates a stable object of callback proxies that forward lifecycle events
 * from a player component (PlayerProxy) to the consumer's callbacks.
 *
 * Callbacks are stored in refs so the proxy object maintains referential
 * stability across renders (important for React.memo comparisons on PlayerProxy).
 *
 * Additionally wraps `onReady` to call `updateState({ isLoading: false })` and
 * wraps `onError` with configurable error classification: some errors are
 * recoverable (ignored), others are fatal (set `kernelError`).
 */
export function usePlayerCallbackProxy(params: UsePlayerCallbackProxyParams): UsePlayerCallbackProxyReturn {
  const {
    onBuffer,
    onBufferEnd,
    onDuration,
    onEnded,
    onError,
    onPause,
    onPlay,
    onPlayBackRateChange,
    onProgress,
    onReady,
    onSeek,
    onStart,
    onLoaded,
    onMount,
    updateState,
    playerState,
    extraProps,
    recoverableErrorTypes = DEFAULT_RECOVERABLE_ERROR_TYPES,
    recoverableErrorDetails = DEFAULT_RECOVERABLE_ERROR_DETAILS,
  } = params;

  // Keep updateState in a ref for stable closures
  const updateStateRef = useRef(updateState);
  updateStateRef.current = updateState;

  // Keep all consumer callbacks in refs so the proxy object stays stable
  const callbacksRef = useRef({
    onBuffer,
    onBufferEnd,
    onDuration,
    onEnded,
    onError,
    onPause,
    onPlay,
    onPlayBackRateChange,
    onProgress,
    onReady,
    onSeek,
    onStart,
    onLoaded,
    onMount,
  });
  callbacksRef.current = {
    onBuffer,
    onBufferEnd,
    onDuration,
    onEnded,
    onError,
    onPause,
    onPlay,
    onPlayBackRateChange,
    onProgress,
    onReady,
    onSeek,
    onStart,
    onLoaded,
    onMount,
  };

  // Keep reactive values in refs for the proxy closures
  const seekingRef = useRef(playerState.seeking);
  seekingRef.current = playerState.seeking;

  const preventedRef = useRef(extraProps.prevented);
  preventedRef.current = extraProps.prevented;

  // Error classification refs
  const recoverableTypesRef = useRef(recoverableErrorTypes);
  recoverableTypesRef.current = recoverableErrorTypes;

  const recoverableDetailsRef = useRef(recoverableErrorDetails);
  recoverableDetailsRef.current = recoverableErrorDetails;

  // Derive videoUrl from extraProps
  const videoUrl =
    extraProps.url ?? (extraProps.sources && extraProps.sources.length > 0 ? extraProps.sources[0]!.src : null);

  // Build proxy object once — uses refs to always read latest callback/state
  const proxy = useMemo(
    () => ({
      onBuffer: () => {
        if (callbacksRef.current.onBuffer) {
          callbacksRef.current.onBuffer();
        }
        updateStateRef.current((prev: any) => ({ ...prev, isBuffering: true }));
      },
      onBufferEnd: () => {
        if (callbacksRef.current.onBufferEnd) {
          callbacksRef.current.onBufferEnd();
        }
        updateStateRef.current((prev: any) => ({ ...prev, isBuffering: false }));
      },
      onDuration: (duration: number) => {
        if (callbacksRef.current.onDuration) {
          callbacksRef.current.onDuration(duration);
        }
        updateStateRef.current((prev: any) => ({ ...prev, duration }));
      },
      onEnded: () => {
        if (callbacksRef.current.onEnded) {
          callbacksRef.current.onEnded();
        }
        updateStateRef.current((prev: any) => ({ ...prev, isEnded: true }));
      },
      onError: (error: any, data?: any, instance?: any, sdk?: string) => {
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(error, data, instance, sdk);
        }
        // Determine if the error is recoverable
        const dataType = data?.type;
        const dataDetails = data?.details;
        const isRecoverable =
          recoverableTypesRef.current.includes(dataType) ||
          (dataType === 'mediaError' && recoverableDetailsRef.current.includes(dataDetails));

        if (!isRecoverable) {
          updateStateRef.current((prev: any) => ({
            ...prev,
            kernelError: data
              ? {
                  type: dataType || 'UnknownError',
                  detail: data?.error?.message || 'Something was wrong with the playback. Please try again.',
                }
              : null,
            isLoading: false,
            playing: false,
          }));
        }
      },
      onPause: () => {
        if (callbacksRef.current.onPause) {
          callbacksRef.current.onPause();
        }
        updateStateRef.current((prev: any) => ({ ...prev, playing: false }));
      },
      onPlay: (event?: { hasAudio?: boolean }) => {
        if (callbacksRef.current.onPlay) {
          callbacksRef.current.onPlay(event);
        }
        updateStateRef.current((prev: any) => {
          const audioFromEvent = event?.hasAudio ?? false;
          const resolvedHasAudio = preventedRef.current ? true : audioFromEvent || prev.hasAudio || false;
          return {
            ...prev,
            playing: true,
            isEnded: false,
            hasAudio: resolvedHasAudio,
          };
        });
      },
      onPlayBackRateChange: (rate: number) => {
        if (callbacksRef.current.onPlayBackRateChange) {
          callbacksRef.current.onPlayBackRateChange(rate);
        }
        updateStateRef.current((prev: any) => ({ ...prev, playbackRate: rate }));
      },
      onProgress: (state: { played: number; loaded: number; playedSeconds?: number }) => {
        if (callbacksRef.current.onProgress) {
          callbacksRef.current.onProgress(state);
        }
        if (!seekingRef.current) {
          updateStateRef.current((prev: any) => ({
            ...prev,
            played: state.playedSeconds ?? state.played,
            loaded: state.loaded,
          }));
        }
      },
      onReady: () => {
        if (callbacksRef.current.onReady) {
          callbacksRef.current.onReady();
        }
        updateStateRef.current((prev: any) => ({ ...prev, isLoading: false }));
      },
      onSeek: (time: number) => {
        if (callbacksRef.current.onSeek) {
          callbacksRef.current.onSeek(time);
        }
        updateStateRef.current((prev: any) => ({ ...prev, seek: time }));
      },
      onStart: () => {
        if (callbacksRef.current.onStart) {
          callbacksRef.current.onStart();
        }
      },
      onLoaded: () => {
        if (callbacksRef.current.onLoaded) {
          callbacksRef.current.onLoaded();
        }
      },
      onMount: () => {
        if (callbacksRef.current.onMount) {
          callbacksRef.current.onMount();
        }
      },
    }),
    // Empty deps — stable forever, reads current values from refs
    [],
  );

  return {
    ...proxy,
    videoUrl,
  };
}
