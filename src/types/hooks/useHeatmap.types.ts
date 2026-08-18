import type { HeatmapDataPoint } from '../heatmap.types';

export interface UseHeatmapParams {
  heatmapData: HeatmapDataPoint[] | null | undefined;
  duration: number;
}

export interface UseHeatmapReturn {
  strokePath: string;
  hasHeatmap: boolean;
}
