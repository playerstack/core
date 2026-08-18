import { useMemo, useCallback } from 'react';
import { computeChapterSegments, getChapterAtTime as coreGetChapterAtTime } from '@chapters';
import { useDeepCompareMemoize } from '@hooks/useDeepCompareMemoize';
import type { UseChaptersParams, UseChaptersReturn } from '@typings/hooks/useChapters.types';

export type { UseChaptersParams, UseChaptersReturn } from '@typings/hooks/useChapters.types';

/**
 * Hook that processes chapter definitions and provides chapter-related
 * utilities for the time slider (segment boundaries, active chapter, etc.)
 *
 * Uses `useDeepCompareMemoize` to stabilize the chapters prop reference,
 * then `useMemo` to compute segments via core's `computeChapterSegments`.
 * Also exposes a stable `getChapterAtTime` callback.
 *
 * @param params - chapters array and total duration
 * @returns computed segments and a lookup function
 */
export function useChapters({ chapters, duration }: UseChaptersParams): UseChaptersReturn {
  const stableChapters = useDeepCompareMemoize(chapters);

  const segments = useMemo(() => computeChapterSegments(stableChapters, duration), [stableChapters, duration]);

  const getChapterAtTime = useCallback((time: number) => coreGetChapterAtTime(segments, time), [segments]);

  return { segments, getChapterAtTime };
}
