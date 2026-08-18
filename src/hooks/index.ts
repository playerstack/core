// Hooks subpath barrel — @playerstack/core/hooks
// React hooks shared across web and React Native packages.

export { useDeepCompareMemoize } from '@hooks/useDeepCompareMemoize';
export { useDoubleTapSkip } from '@hooks/useDoubleTapSkip';
export type { UseDoubleTapSkipParams, SkipState, UseDoubleTapSkipReturn } from '@typings/hooks/useDoubleTapSkip.types';
export { useAutoHide } from '@hooks/useAutoHide';
export type { UseAutoHideParams, UseAutoHideReturn } from '@typings/hooks/useAutoHide.types';
export { useMobileAutoHide } from '@hooks/useMobileAutoHide';
export type { UseMobileAutoHideParams, UseMobileAutoHideReturn } from '@typings/hooks/useMobileAutoHide.types';
export { useChapters } from '@hooks/useChapters';
export type { UseChaptersParams, UseChaptersReturn } from '@typings/hooks/useChapters.types';
export { useHeatmap } from '@hooks/useHeatmap';
export type { UseHeatmapParams, UseHeatmapReturn } from '@typings/hooks/useHeatmap.types';
export { useAds } from '@hooks/useAds';
export type { UseAdsParams, UseAdsReturn } from '@typings/hooks/useAds.types';
export { mergeRefs } from '@hooks/utils/mergeRefs';
export { lazy } from '@hooks/utils/lazy';
export { useVolume } from '@hooks/useVolume';
export type { UseVolumeParams, UseVolumeReturn } from '@typings/hooks/useVolume.types';
export { createPlayerContext } from '@hooks/context/createPlayerContext';
export type {
  CreatePlayerContextOptions,
  PlayerContextResult,
  ProviderProps,
} from '@typings/hooks/context/createPlayerContext.types';
export { usePlayerCallbackProxy } from '@hooks/usePlayerCallbackProxy';
export type {
  UsePlayerCallbackProxyParams,
  UsePlayerCallbackProxyReturn,
} from '@typings/hooks/usePlayerCallbackProxy.types';
export { useLiveDVR } from '@hooks/useLiveDVR';
export type { UseLiveDVRParams, UseLiveDVRReturn } from '@typings/hooks/useLiveDVR.types';
export { usePlayerOrchestration } from '@hooks/usePlayerOrchestration';
export type {
  UsePlayerOrchestrationParams,
  UsePlayerOrchestrationReturn,
  QualitySwitchConfig,
} from '@typings/hooks/usePlayerOrchestration.types';
