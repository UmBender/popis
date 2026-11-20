import { describe, expect, it } from "vitest";
import { EDIT_HELP } from "./edit-help";

// AC-7: a sentence and a competitive-programming example for each new command.

const NEW_COMMANDS = [
  ...["v", "V", "<C-v>", "vo", "gv"],
  ...["<C-v>I", "<C-v>A", "<C-v>$A"],
  ...[">>", "<<", ">", "J"],
  ...[":s", ":%s", ":noh"],
];

// AC-7 of T16: each register and each macro command explained, with its use in CP.
const REGISTER_COMMANDS = [
  ...['"a', '"A', '"0', '"1', '"-', '"_', '""'],
  ...["q", "@a", "@@", "9@a", "<C-a>", "<C-x>", "i_<C-r>"],
];

describe("register help", () => {
  it.each(REGISTER_COMMANDS)("command %s has a sentence and an example", (keys) => {
    const help = EDIT_HELP.find((h) => h.keys === keys);
    expect(help, keys).toBeDefined();
    expect(help?.text.length).toBeGreaterThan(10);
    expect(help?.example?.length).toBeGreaterThan(5);
  });

  it("the delete-debug-line example keeps the yank with the black hole register", () => {
    expect(EDIT_HELP.find((h) => h.keys === '"_')?.example).toContain('"_dd');
  });

  it("the macro example numbers lines", () => {
    expect(EDIT_HELP.find((h) => h.keys === "q")?.example).toContain("<C-a>");
  });
});

describe("edit help", () => {
  it.each(NEW_COMMANDS)("command %s has a sentence and an example", (keys) => {
    const help = EDIT_HELP.find((h) => h.keys === keys);
    expect(help, keys).toBeDefined();
    expect(help?.text.length).toBeGreaterThan(10);
    expect(help?.example?.length).toBeGreaterThan(5);
  });

  it("every key is listed once", () => {
    const keys = EDIT_HELP.map((h) => h.keys);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("the comment example is the one the owner asked for", () => {
    const help = EDIT_HELP.find((h) => h.keys === "<C-v>I");
    expect(help?.example).toContain("// ");
  });
});
