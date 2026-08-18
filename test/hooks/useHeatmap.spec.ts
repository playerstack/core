/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useHeatmap } from '../../src/hooks/useHeatmap';

describe('useHeatmap', () => {
  describe('returns empty path and hasHeatmap=false for null/undefined data', () => {
    it('handles null heatmapData', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: null, duration: 100 }));
      expect(result.current.strokePath).toBe('');
      expect(result.current.hasHeatmap).toBe(false);
    });

    it('handles undefined heatmapData', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: undefined, duration: 100 }));
      expect(result.current.strokePath).toBe('');
      expect(result.current.hasHeatmap).toBe(false);
    });

    it('handles empty array', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: [], duration: 100 }));
      expect(result.current.strokePath).toBe('');
      expect(result.current.hasHeatmap).toBe(false);
    });
  });

  describe('returns empty path for duration <= 0', () => {
    const data = [
      { startTime: 0, endTime: 10, value: 0.5 },
      { startTime: 10, endTime: 20, value: 0.8 },
    ];

    it('handles duration = 0', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: 0 }));
      expect(result.current.strokePath).toBe('');
      expect(result.current.hasHeatmap).toBe(false);
    });

    it('handles negative duration', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: -10 }));
      expect(result.current.strokePath).toBe('');
      expect(result.current.hasHeatmap).toBe(false);
    });
  });

  describe('computes correct path from valid data', () => {
    const data = [
      { startTime: 0, endTime: 10, value: 0.5 },
      { startTime: 10, endTime: 20, value: 0.8 },
      { startTime: 20, endTime: 30, value: 0.3 },
    ];

    it('starts at floor anchor (0,100)', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: 100 }));
      expect(result.current.strokePath).toMatch(/^M 0,100/);
    });

    it('ends at floor anchor (100,100)', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: 100 }));
      expect(result.current.strokePath).toContain('100,100');
    });

    it('contains cubic Bézier commands', () => {
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: 100 }));
      expect(result.current.strokePath).toContain(' C ');
    });
  });

  describe('hasHeatmap is true when path is non-empty', () => {
    it('returns true for valid data with 2+ points', () => {
      const data = [
        { startTime: 0, endTime: 50, value: 0.5 },
        { startTime: 50, endTime: 100, value: 0.8 },
      ];
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: 100 }));
      expect(result.current.hasHeatmap).toBe(true);
      expect(result.current.strokePath.length).toBeGreaterThan(0);
    });

    it('returns false for single data point (insufficient for path)', () => {
      const data = [{ startTime: 0, endTime: 10, value: 0.5 }];
      const { result } = renderHook(() => useHeatmap({ heatmapData: data, duration: 100 }));
      expect(result.current.hasHeatmap).toBe(false);
    });
  });

  describe('stable reference on same content re-render', () => {
    it('returns same strokePath reference when data is deeply equal', () => {
      const data1 = [
        { startTime: 0, endTime: 50, value: 0.5 },
        { startTime: 50, endTime: 100, value: 0.8 },
      ];
      const data2 = [
        { startTime: 0, endTime: 50, value: 0.5 },
        { startTime: 50, endTime: 100, value: 0.8 },
      ];
      const { result, rerender } = renderHook(
        ({ data, dur }) => useHeatmap({ heatmapData: data, duration: dur }),
        { initialProps: { data: data1, dur: 100 } },
      );

      const firstPath = result.current.strokePath;
      rerender({ data: data2, dur: 100 });
      expect(result.current.strokePath).toBe(firstPath);
    });

    it('recomputes when data changes', () => {
      const data1 = [
        { startTime: 0, endTime: 50, value: 0.5 },
        { startTime: 50, endTime: 100, value: 0.8 },
      ];
      const data2 = [
        { startTime: 0, endTime: 50, value: 0.9 },
        { startTime: 50, endTime: 100, value: 0.2 },
      ];
      const { result, rerender } = renderHook(
        ({ data, dur }) => useHeatmap({ heatmapData: data, duration: dur }),
        { initialProps: { data: data1, dur: 100 } },
      );

      const firstPath = result.current.strokePath;
      rerender({ data: data2, dur: 100 });
      expect(result.current.strokePath).not.toBe(firstPath);
    });
  });
});
