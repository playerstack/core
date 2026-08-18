import type { ChapterInput, ChapterSegment } from '../chapters.types';

export interface UseChaptersParams {
  chapters: ChapterInput[] | null | undefined;
  duration: number;
}

export interface UseChaptersReturn {
  segments: ChapterSegment[];
  getChapterAtTime: (time: number) => ChapterSegment | null;
}
