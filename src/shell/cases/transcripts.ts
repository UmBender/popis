export type ShellTranscriptFrame = {
  readonly cmd: string | null;
  readonly cwd: string;
  readonly files: readonly string[];
  readonly output: readonly string[];
};

export type ShellLessonTranscript = {
  readonly fixture: string;
  readonly frames: readonly ShellTranscriptFrame[];
};

export const SHELL_TRANSCRIPTS: Readonly<Record<string, ShellLessonTranscript>> = {};
