import { useMemo } from 'react';
import { generateHeatmapPath } from '../heatmap';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';
import type { UseHeatmapParams, UseHeatmapReturn } from '../types/hooks/useHeatmap.types';

export type { UseHeatmapParams, UseHeatmapReturn } from '../types/hooks/useHeatmap.types';

/**
 * Hook that processes raw heatmap data (most replayed / view intensity)
 * into a normalized SVG stroke path suitable for rendering above the time slider.
 *
 * Uses `useDeepCompareMemoize` to stabilize the `heatmapData` prop reference,
 * then `useMemo` to compute the SVG path via core's `generateHeatmapPath`.
 */
export function useHeatmap({ heatmapData, duration }: UseHeatmapParams): UseHeatmapReturn {
  const stableData = useDeepCompareMemoize(heatmapData);

  const strokePath = useMemo(() => generateHeatmapPath(stableData, duration), [stableData, duration]);

  const hasHeatmap = strokePath.length > 0;

  return { strokePath, hasHeatmap };
}
