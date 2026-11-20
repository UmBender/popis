// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock } from "../core/clock";
import { memoryStore } from "../storage/history";
import { VIM_EDIT_SETTINGS_KEY } from "../storage/vim";
import { EDIT_KIND_LABELS, generateEdit, type EditKind } from "../vim/drills/edit";
import { parseKeys } from "../vim/keys";
import { VimScreen } from "./VimScreen";

// T15 AC-7 and AC-8 (screen): the mode names, the selection, the command line
// in the status bar, the new commands in the panel and the new kinds.

const SEED = 21;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(kinds: readonly EditKind[]) {
  const store = memoryStore({
    [VIM_EDIT_SETTINGS_KEY]: JSON.stringify({ drill: "edit", durationS: 60, kinds }),
  });
  render(<VimScreen clock={manualClock()} store={store} newSeed={() => SEED} onBack={vi.fn()} />);
}

const box = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Teclas do Vim" });
const status = () => screen.getByTestId("vim-status").textContent ?? "";

const EVENT_KEYS: Record<string, string> = {
  "<CR>": "Enter",
  "<Esc>": "Escape",
  "<BS>": "Backspace",
};

/** Returns whether the last key was prevented (so it never reaches the browser). */
function press(keys: string): boolean {
  let prevented = true;
  for (const key of parseKeys(keys)) {
    const ctrl = /^<C-(.)>$/.exec(key);
    const init = ctrl ? { key: ctrl[1], ctrlKey: true } : { key: EVENT_KEYS[key] ?? key };
    prevented = !fireEvent.keyDown(box(), init);
  }
  return prevented;
}

describe("VimScreen visual mode", () => {
  it("the status line names the visual modes", () => {
    setup(["delete-line"]);
    press("v");
    expect(status()).toContain("VISUAL");
    press("<Esc>V");
    expect(status()).toContain("V-LINE");
    press("<Esc><C-v>");
    expect(status()).toContain("V-BLOCK");
    press("<Esc>");
    expect(status()).toContain("NORMAL");
  });

  it("Ctrl+V is a Vim key: it is prevented, not pasted", () => {
    setup(["delete-line"]);
    expect(press("<C-v>")).toBe(true);
  });

  it("marks the selected characters", () => {
    setup(["delete-line"]);
    press("v");
    expect(screen.getByTestId("vim-code").querySelectorAll(".vim-selected")).toHaveLength(1);
    press("ll");
    expect(screen.getByTestId("vim-code").querySelectorAll(".vim-selected")).toHaveLength(3);
  });

  it("marks a block as a rectangle", () => {
    setup(["delete-line"]);
    press("<C-v>jl");
    expect(screen.getByTestId("vim-code").querySelectorAll(".vim-selected")).toHaveLength(4);
  });

  it("shows the command line in the status bar", () => {
    setup(["delete-line"]);
    press(":s/a");
    expect(status()).toContain(":s/a");
    expect(status()).not.toContain("NORMAL");
    press("<Esc>");
    expect(status()).toContain("NORMAL");
  });

  it("shows the range that : adds in visual mode", () => {
    setup(["delete-line"]);
    press("V:");
    expect(status()).toContain(":'<,'>");
  });

  it("the commands panel explains each new command with an example", () => {
    setup(["delete-line"]);
    const panel = screen.getByRole("group", { name: "Comandos" });
    for (const keys of ["v", "V", "<C-v>", "gv", "<C-v>I", "<C-v>$A", ">>", "J", ":s", ":%s"]) {
      expect(within(panel).getByText(keys, { selector: "code" })).toBeTruthy();
    }
    expect(panel.textContent).toContain("// ");
  });

  it("the new kinds have a checkbox", () => {
    setup(["delete-line"]);
    for (const kind of ["comment-block", "rename-variable", "join-lines"] as const) {
      expect(screen.getByRole("checkbox", { name: EDIT_KIND_LABELS[kind] })).toBeTruthy();
    }
  });

  it("typing the reference of a block edit finishes it", () => {
    setup(["comment-block"]);
    const first = generateEdit(SEED, 0, ["comment-block"]);
    expect(screen.getByTestId("vim-code").dataset["editIndex"]).toBe("0");
    press(first.reference);
    expect(screen.getByTestId("vim-code").dataset["editIndex"]).toBe("1");
  });
});
