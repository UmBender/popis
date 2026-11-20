/** `[line, column]`, both 0-based. */
export type Cursor = readonly [line: number, col: number];

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
