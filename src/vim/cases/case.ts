/** `[line, column]`, both 0-based. */
export type Cursor = readonly [line: number, col: number];

/** What Neovim holds after an edit case: the buffer, the cursor and the unnamed register. */
export type EditExpect = {
  /** The buffer, lines joined by "\n". */
  readonly text: string;
  readonly cursor: Cursor;
  /** `getreg('"')`: "a\nb" for text, "a\n" for whole lines. */
  readonly reg: string;
  /**
   * `getregtype('"')`: "" (empty), "v" (characters), "V" (lines) or, for a
   * block, Ctrl-V and its width ("\x163").
   */
  readonly regtype: "" | "v" | "V" | `\x16${number}`;
};

/**
 * One edit case (ADR-T14-1): like a `VimCase`, but the keys change the text, so
 * the expectation holds the buffer and the register too. The keys end back in
 * normal mode. The name starts with the command under test ("dw: ...").
 */
export type EditCase = readonly [
  name: string,
  text: string,
  from: Cursor,
  keys: string,
  expect: EditExpect,
];

/** One register after a case: `getreg()` and `getregtype()`, like `EditExpect`. */
export type RegisterContent = {
  readonly reg: string;
  readonly regtype: "v" | "V" | `\x16${number}`;
};

/**
 * What Neovim holds after a register case (ADR-T16-1): the edit expectation
 * and every register that is not empty among `0`–`9`, `-` and `a`–`z`.
 */
export type RegisterExpect = EditExpect & {
  readonly regs: Readonly<Record<string, RegisterContent>>;
};

/** An edit case that also checks the registers it leaves behind. */
export type RegisterCase = readonly [
  name: string,
  text: string,
  from: Cursor,
  keys: string,
  expect: RegisterExpect,
];

/**
 * One fidelity case (ADR-T13-1): the buffer `text` (lines joined by "\n"),
 * the cursor before, the keys typed in normal mode and the cursor after.
 * The name starts with the motion under test, as in "w: stops at punctuation".
 * The Vitest suite runs the engine on it and `npm run vim:oracle` runs it in
 * `nvim --clean --headless`. Files hold only data and type imports, so Node
 * can load them without a build step.
 */
export type VimCase = readonly [
  name: string,
  text: string,
  from: Cursor,
  keys: string,
  expect: Cursor,
];
