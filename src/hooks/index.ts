// Hooks subpath barrel — @playerstack/core/hooks
// React hooks shared across web and React Native packages.

export { useDeepCompareMemoize } from './useDeepCompareMemoize';
export { useDoubleTapSkip } from './useDoubleTapSkip';
export type { UseDoubleTapSkipParams, SkipState, UseDoubleTapSkipReturn } from '../types/hooks/useDoubleTapSkip.types';
export { useAutoHide } from './useAutoHide';
export type { UseAutoHideParams, UseAutoHideReturn } from '../types/hooks/useAutoHide.types';
export { useMobileAutoHide } from './useMobileAutoHide';
export type { UseMobileAutoHideParams, UseMobileAutoHideReturn } from '../types/hooks/useMobileAutoHide.types';
export { useChapters } from './useChapters';
export type { UseChaptersParams, UseChaptersReturn } from '../types/hooks/useChapters.types';
export { useHeatmap } from './useHeatmap';
export type { UseHeatmapParams, UseHeatmapReturn } from '../types/hooks/useHeatmap.types';
export { useAds } from './useAds';
export type { UseAdsParams, UseAdsReturn } from '../types/hooks/useAds.types';
export { mergeRefs } from './utils/mergeRefs';
export { lazy } from './utils/lazy';
export { useVolume } from './useVolume';
export type { UseVolumeParams, UseVolumeReturn } from '../types/hooks/useVolume.types';
export { createPlayerContext } from './context/createPlayerContext';
export type {
  CreatePlayerContextOptions,
  PlayerContextResult,
  ProviderProps,
} from '../types/hooks/context/createPlayerContext.types';
export { usePlayerCallbackProxy } from './usePlayerCallbackProxy';
export type {
  UsePlayerCallbackProxyParams,
  UsePlayerCallbackProxyReturn,
} from '../types/hooks/usePlayerCallbackProxy.types';
export { useLiveDVR } from './useLiveDVR';
export type { UseLiveDVRParams, UseLiveDVRReturn } from '../types/hooks/useLiveDVR.types';
export { usePlayerOrchestration } from './usePlayerOrchestration';
export type {
  UsePlayerOrchestrationParams,
  UsePlayerOrchestrationReturn,
  QualitySwitchConfig,
} from '../types/hooks/usePlayerOrchestration.types';
