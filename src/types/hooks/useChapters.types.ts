import type { ChapterInput, ChapterSegment } from '@typings/chapters.types';

export interface UseChaptersParams {
  chapters: ChapterInput[] | null | undefined;
  duration: number;
}

export interface UseChaptersReturn {
  segments: ChapterSegment[];
  getChapterAtTime: (time: number) => ChapterSegment | null;
}
