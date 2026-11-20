import { describe, expect, it } from "vitest";
import { EDIT_HELP } from "./edit-help";

// AC-7: a sentence and a competitive-programming example for each new command.

const NEW_COMMANDS = [
  ...["v", "V", "<C-v>", "vo", "gv"],
  ...["<C-v>I", "<C-v>A", "<C-v>$A"],
  ...[">>", "<<", ">", "J"],
  ...[":s", ":%s", ":noh"],
];

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
