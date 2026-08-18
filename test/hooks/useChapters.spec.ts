/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useChapters } from '@hooks/useChapters';

describe('useChapters', () => {
  const sampleChapters = [
    { title: 'Intro', startTime: 0 },
    { title: 'Main', startTime: 30 },
    { title: 'Outro', startTime: 80 },
  ];

  describe('segments computation', () => {
    it('returns empty segments for null chapters', () => {
      const { result } = renderHook(() => useChapters({ chapters: null, duration: 100 }));
      expect(result.current.segments).toEqual([]);
    });

    it('returns empty segments for undefined chapters', () => {
      const { result } = renderHook(() => useChapters({ chapters: undefined, duration: 100 }));
      expect(result.current.segments).toEqual([]);
    });

    it('returns empty segments for duration <= 0', () => {
      const { result } = renderHook(() => useChapters({ chapters: sampleChapters, duration: 0 }));
      expect(result.current.segments).toEqual([]);

      const { result: result2 } = renderHook(() => useChapters({ chapters: sampleChapters, duration: -5 }));
      expect(result2.current.segments).toEqual([]);
    });

    it('computes correct segments from valid chapters', () => {
      const { result } = renderHook(() => useChapters({ chapters: sampleChapters, duration: 100 }));
      const { segments } = result.current;

      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({
        title: 'Intro',
        startTime: 0,
        endTime: 30,
        startPercent: 0,
        endPercent: 30,
      });
      expect(segments[1]).toEqual({
        title: 'Main',
        startTime: 30,
        endTime: 80,
        startPercent: 30,
        endPercent: 80,
      });
      expect(segments[2]).toEqual({
        title: 'Outro',
        startTime: 80,
        endTime: 100,
        startPercent: 80,
        endPercent: 100,
      });
    });
  });

  describe('getChapterAtTime', () => {
    it('returns correct chapter for a given time', () => {
      const { result } = renderHook(() => useChapters({ chapters: sampleChapters, duration: 100 }));
      const chapter = result.current.getChapterAtTime(50);
      expect(chapter).not.toBeNull();
      expect(chapter!.title).toBe('Main');
    });

    it('returns null when segments are empty', () => {
      const { result } = renderHook(() => useChapters({ chapters: null, duration: 100 }));
      expect(result.current.getChapterAtTime(50)).toBeNull();
    });

    it('returns first chapter for time 0', () => {
      const { result } = renderHook(() => useChapters({ chapters: sampleChapters, duration: 100 }));
      const chapter = result.current.getChapterAtTime(0);
      expect(chapter!.title).toBe('Intro');
    });
  });

  describe('memoization stability', () => {
    it('re-renders with same content do not change segments reference', () => {
      const { result, rerender } = renderHook(
        ({ ch, dur }) => useChapters({ chapters: ch, duration: dur }),
        { initialProps: { ch: [{ title: 'A', startTime: 0 }], dur: 60 } },
      );
      const firstSegments = result.current.segments;
      const firstFn = result.current.getChapterAtTime;

      // Rerender with new array reference but same content
      rerender({ ch: [{ title: 'A', startTime: 0 }], dur: 60 });

      expect(result.current.segments).toBe(firstSegments);
      expect(result.current.getChapterAtTime).toBe(firstFn);
    });
  });
});
