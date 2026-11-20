// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { loadVimEditResults, VIM_EDIT_SETTINGS_KEY, loadVimEditSettings } from "../storage/vim";
import { generateEdit, EDIT_KIND_LABELS, EDIT_KINDS, type EditKind } from "../vim/drills/edit";
import { parseKeys } from "../vim/keys";
import { VimScreen } from "./VimScreen";

// AC-8: the edit drill on the Vim screen. Keys arrive through the same
// invisible textarea as in the motion drill.

const SEED = 21;

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function storeWith(kinds: readonly EditKind[] = EDIT_KINDS, durationS = 60): KeyValueStore {
  return memoryStore({
    [VIM_EDIT_SETTINGS_KEY]: JSON.stringify({ drill: "edit", durationS, kinds }),
  });
}

function setup(store: KeyValueStore = storeWith()) {
  render(<VimScreen clock={clock} store={store} newSeed={() => SEED} onBack={vi.fn()} />);
  return store;
}

const box = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Teclas do Vim" });
const code = () => screen.getByTestId("vim-code");
const after = () => screen.getByTestId("vim-after");
const status = () => screen.getByTestId("vim-status");

const EVENT_KEYS: Record<string, string> = {
  "<CR>": "Enter",
  "<Esc>": "Escape",
  "<BS>": "Backspace",
};

function press(keys: string) {
  for (const key of parseKeys(keys)) {
    fireEvent.keyDown(box(), { key: EVENT_KEYS[key] ?? key });
  }
}

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

describe("VimScreen edit drill", () => {
  it("the Treino choice switches to the edit drill and is saved", () => {
    const store = memoryStore();
    setup(store);
    expect(screen.queryByTestId("vim-after")).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Treino" }), {
      target: { value: "edit" },
    });
    expect(after()).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Nível" })).toBeNull();
    expect(loadVimEditSettings(store).drill).toBe("edit");
  });

  it("shows the before with the cursor and the after below it", () => {
    setup();
    const edit = generateEdit(SEED, 0, EDIT_KINDS);
    expect(code().textContent).toBe(edit.lines.join("\n"));
    expect(after().textContent).toBe(edit.after.join("\n"));
    expect(after().dataset["reference"]).toBe(edit.reference);
    const cursor = screen.getByTestId("vim-cursor");
    expect([Number(cursor.dataset["line"]), Number(cursor.dataset["col"])]).toEqual([
      edit.start.line,
      edit.start.col,
    ]);
    expect(document.activeElement).toBe(box());
  });

  it("highlights the difference in the before and in the after", () => {
    setup(storeWith(["change-word"]));
    expect(code().querySelectorAll(".vim-diff-del").length).toBeGreaterThan(0);
    expect(after().querySelectorAll(".vim-diff-add").length).toBeGreaterThan(0);
  });

  it("the status line shows the mode and the pending keys", () => {
    setup();
    expect(status().textContent).toContain("NORMAL");
    press("d2");
    expect(screen.getByTestId("vim-status").textContent).toContain("d2");
    press("<Esc>i");
    expect(screen.getByTestId("vim-status").textContent).toContain("INSERT");
    press("<Esc>");
    expect(screen.getByTestId("vim-status").textContent).toContain("NORMAL");
  });

  it("typing the reference shows the next edit and the comparison", () => {
    setup(storeWith(["delete-line"]));
    const first = generateEdit(SEED, 0, ["delete-line"]);
    expect(code().dataset["editIndex"]).toBe("0");
    press(first.reference);
    expect(code().dataset["editIndex"]).toBe("1");
    expect(screen.getByTestId("vim-last").textContent).toBe(
      `você: ${String(first.referenceKeys)} · referência: ${String(first.referenceKeys)} (${first.reference})`,
    );
  });

  it("Ctrl+Enter skips the edit", () => {
    setup(storeWith(["delete-line"]));
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(code().dataset["editIndex"]).toBe("1");
    expect(screen.getByTestId("vim-last").textContent).toContain("pulado");
  });

  it("the kinds can be switched off one by one, but not all", () => {
    const store = setup();
    for (const kind of EDIT_KINDS.slice(1)) {
      fireEvent.click(screen.getByRole("checkbox", { name: EDIT_KIND_LABELS[kind] }));
    }
    const only = EDIT_KINDS[0] as EditKind;
    expect(loadVimEditSettings(store).kinds).toEqual([only]);
    const last = screen.getByRole<HTMLInputElement>("checkbox", { name: EDIT_KIND_LABELS[only] });
    expect(last.checked).toBe(true);
    expect(last.disabled).toBe(true);
    expect(after().dataset["reference"]).toBe(generateEdit(SEED, 0, [only]).reference);
  });

  it("the commands panel lists the operators and the text objects", () => {
    setup();
    const panel = screen.getByRole("group", { name: "Comandos" });
    for (const keys of ["d", "c", "y", "iw", "aw", "i(", 'i"', "u", "."]) {
      expect(within(panel).getByText(keys, { selector: "code" })).toBeTruthy();
    }
  });

  it("the end shows the reached edits, the efficiency and better than the reference", () => {
    const store = setup(storeWith(["append-semicolon"]));
    const first = generateEdit(SEED, 0, ["append-semicolon"]);
    // A; finishes the edit without Esc: one key less than the reference.
    press(first.reference.replace("<Esc>", ""));
    advance(61_000);
    expect(screen.getByTestId("vim-reached").textContent).toBe("1");
    expect(screen.getByTestId("vim-efficiency").textContent).toBe("150%");
    expect(screen.getByTestId("vim-better").textContent).toBe("melhor que a referência");
    expect(loadVimEditResults(store)).toHaveLength(1);
    expect(loadVimEditResults(store)[0]).toMatchObject({ kind: "edit", reached: 1, durationS: 60 });
  });

  it("the summary is for the edit drill alone", () => {
    setup(storeWith(["append-semicolon"]));
    expect(screen.getByTestId("vim-summary").textContent).toBe(
      "Sem resultados nesta configuração.",
    );
    press(generateEdit(SEED, 0, ["append-semicolon"]).reference);
    advance(61_000);
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByTestId("vim-summary").textContent).toBe(
      "melhor 1 edições · média dos últimos 10: 1 edições",
    );
  });
});
