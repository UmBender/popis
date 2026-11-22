export type TranscriptFrame = {
  readonly cmd: string | null;
  readonly output: readonly string[];
  readonly line: number | null;
  readonly breakpoints: readonly number[];
};

export type LessonTranscript = {
  readonly programId: string;
  readonly frames: readonly TranscriptFrame[];
};

export const LESSON_TRANSCRIPTS: Readonly<Record<string, LessonTranscript>> = {};
