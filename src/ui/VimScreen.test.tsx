// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { memoryStore, type KeyValueStore } from "../storage/history";
import {
  appendVimResult,
  loadVimResults,
  loadVimSettings,
  VIM_SETTINGS_KEY,
  type VimResult,
} from "../storage/vim";
import { generateTarget } from "../vim/drills/target";
import { parseKeys } from "../vim/keys";
import { VimScreen } from "./VimScreen";

// AC-8: the Vim screen. Keys arrive through an invisible textarea.

const SEED = 21;

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(store: KeyValueStore = memoryStore(), seeds: readonly number[] = [SEED]) {
  let next = 0;
  const onBack = vi.fn();
  const newSeed = () => seeds[Math.min(next++, seeds.length - 1)] ?? SEED;
  render(<VimScreen clock={clock} store={store} newSeed={newSeed} onBack={onBack} />);
  return { store, onBack };
}

function storeAt(level: number, durationS = 60): KeyValueStore {
  return memoryStore({ [VIM_SETTINGS_KEY]: JSON.stringify({ level, durationS }) });
}

const box = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Teclas do Vim" });
const target = () => screen.getByTestId("vim-target");
const cursor = () => screen.getByTestId("vim-cursor");
const pos = (el: HTMLElement) => [Number(el.dataset["line"]), Number(el.dataset["col"])];

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

function result(over: Partial<VimResult> = {}): VimResult {
  return {
    version: 1,
    level: 1,
    durationS: 60,
    seed: 1,
    reached: 12,
    skipped: 0,
    efficiency: 0.9,
    finishedAt: 0,
    ...over,
  };
}

describe("VimScreen", () => {
  it("shows the first target of the seed with the cursor at the start, focused", () => {
    setup(storeAt(2));
    const expected = generateTarget(SEED, 0, 2);
    expect(screen.getByRole("heading", { level: 1, name: "Movimento" })).toBeTruthy();
    expect(document.activeElement).toBe(box());
    expect(pos(cursor())).toEqual([expected.start.line, expected.start.col]);
    expect(pos(target())).toEqual([expected.target.line, expected.target.col]);
    expect(target().dataset["solution"]).toBe(expected.solution);
    expect(target().dataset["minimum"]).toBe(String(expected.minimum));
    expect(screen.getByTestId("vim-code").textContent).toBe(expected.lines.join("\n"));
  });

  it("shows the mode and the pending keys in the status line", () => {
    setup(storeAt(5));
    expect(screen.getByTestId("vim-status").textContent).toContain("NORMAL");
    press("2");
    expect(screen.getByTestId("vim-status").textContent).toContain("2");
    press("f");
    expect(screen.getByTestId("vim-status").textContent).toContain("2f");
    press("<Esc>");
    expect(screen.getByTestId("vim-status").textContent).not.toContain("2f");
  });

  it("shows a blocked key without moving the cursor", () => {
    setup(storeAt(1));
    const before = pos(cursor());
    press("w");
    expect(screen.getByTestId("vim-blocked").textContent).toBe("bloqueado neste nível: w");
    expect(pos(cursor())).toEqual(before);
    press("l");
    expect(screen.queryByTestId("vim-blocked")).toBeNull();
  });

  it("typing the solution reaches the target and shows the next one at once", () => {
    setup(storeAt(4));
    const first = generateTarget(SEED, 0, 4);
    press(first.solution);
    const second = generateTarget(SEED, 1, 4);
    expect(target().dataset["solution"]).toBe(second.solution);
    expect(pos(cursor())).toEqual([second.start.line, second.start.col]);
    const count = parseKeys(first.solution).length;
    expect(screen.getByTestId("vim-last").textContent).toBe(
      `você: ${String(count)} teclas · ótimo: ${String(first.minimum)} (${first.solution})`,
    );
  });

  it("the clock starts on the first key", () => {
    setup(storeAt(1));
    expect(screen.getByTestId("vim-time").textContent).toBe("60 s");
    advance(5000);
    expect(screen.getByTestId("vim-time").textContent).toBe("60 s");
    press("<Esc>");
    advance(5000);
    expect(screen.getByTestId("vim-time").textContent).toBe("55 s");
  });

  it("Ctrl+Enter skips the target", () => {
    setup(storeAt(2));
    press("<Esc>");
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(target().dataset["solution"]).toBe(generateTarget(SEED, 1, 2).solution);
    expect(screen.getByTestId("vim-code").dataset["targetIndex"]).toBe("1");
  });

  it("Meta+Enter skips the target too", () => {
    setup(storeAt(2));
    fireEvent.keyDown(box(), { key: "Enter", metaKey: true });
    expect(screen.getByTestId("vim-code").dataset["targetIndex"]).toBe("1");
  });

  it("Ctrl+V, Ctrl+A and Ctrl+R do not reach the browser", () => {
    setup(storeAt(1));
    for (const key of ["v", "a", "r"]) {
      expect(fireEvent.keyDown(box(), { key, ctrlKey: true })).toBe(false);
    }
  });

  it("a dead key typed through composition acts as the key itself", () => {
    setup(storeAt(3));
    // The dead key itself is not prevented: the browser must compose it.
    expect(fireEvent.keyDown(box(), { key: "Dead" })).toBe(true);
    fireEvent.compositionEnd(box(), { target: { value: "$" } });
    const line = pos(cursor())[0] ?? 0;
    const lines = (screen.getByTestId("vim-code").textContent ?? "").split("\n");
    expect(pos(cursor())[1]).toBe((lines[line] ?? "").length - 1);
    expect(box().value).toBe("");
  });

  it("text typed without a key event is read as keys", () => {
    setup(storeAt(3));
    const start = pos(cursor());
    fireEvent.change(box(), { target: { value: "$" } });
    expect(pos(cursor())[1]).not.toBe(start[1] ?? -1);
    expect(box().value).toBe("");
  });

  it("lists the commands of the level with a sentence each", () => {
    setup(storeAt(4));
    const panel = screen.getByRole("group", { name: "Comandos deste nível" });
    const text = panel.textContent ?? "";
    for (const keys of ["h", "w", "$", "f{c}", "t{c}", ";"]) expect(text).toContain(keys);
    expect(text).toContain("vírgula");
    expect(text).not.toContain("{n}G");
  });

  it("changing the level or the duration restarts the round and saves the choice", () => {
    const { store } = setup(storeAt(1));
    fireEvent.change(screen.getByRole("combobox", { name: "Nível" }), { target: { value: "4" } });
    expect(loadVimSettings(store)).toEqual({ level: 4, durationS: 60 });
    expect(target().dataset["solution"]).toBe(generateTarget(SEED, 0, 4).solution);
    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    expect(loadVimSettings(store)).toEqual({ level: 4, durationS: 30 });
    expect(screen.getByTestId("vim-time").textContent).toBe("30 s");
  });

  it("the round ends when the time is up and shows the results", () => {
    const { store } = setup(storeAt(1, 30));
    press(generateTarget(SEED, 0, 1).solution);
    press(generateTarget(SEED, 1, 1).solution);
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    advance(31_000);
    expect(screen.getByTestId("vim-reached").textContent).toBe("2");
    expect(screen.getByTestId("vim-skipped").textContent).toBe("1");
    expect(screen.getByTestId("vim-efficiency").textContent).toBe("100%");
    expect(screen.getByTestId("vim-seed").textContent).toBe(String(SEED));
    expect(screen.getByTestId("vim-config").textContent).toContain("nível 1");
    expect(screen.getByTestId("vim-worst").querySelectorAll("li").length).toBe(2);
    expect(screen.getByTestId("vim-worst").textContent).toContain("ótimo");
    const saved = loadVimResults(store);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ level: 1, durationS: 30, seed: SEED, reached: 2, skipped: 1 });
  });

  it("keys after the end of the round do nothing", () => {
    setup(storeAt(1, 30));
    press("<Esc>");
    advance(31_000);
    press("jjj");
    expect(screen.queryByTestId("vim-cursor")).toBeNull();
    expect(screen.getByTestId("vim-reached").textContent).toBe("0");
  });

  it("Jogar de novo starts a new round with a new seed", () => {
    setup(storeAt(1, 30), [SEED, SEED + 1]);
    press("<Esc>");
    advance(31_000);
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(target().dataset["solution"]).toBe(generateTarget(SEED + 1, 0, 1).solution);
    expect(screen.getByTestId("vim-time").textContent).toBe("30 s");
    expect(document.activeElement).toBe(box());
  });

  it("Voltar goes back, before and after the round", () => {
    const { onBack } = setup(storeAt(1, 30));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    press("<Esc>");
    advance(31_000);
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it("the summary shows the best count and the last 10 for this level and duration", () => {
    const store = storeAt(1);
    appendVimResult(store, result({ reached: 20 }));
    appendVimResult(store, result({ reached: 10 }));
    appendVimResult(store, result({ reached: 99, level: 2 }));
    setup(store);
    expect(screen.getByTestId("vim-summary").textContent).toContain("melhor 20 alvos");
    expect(screen.getByTestId("vim-summary").textContent).toContain("média 15 alvos");
  });

  it("the summary says so when there are no results", () => {
    setup(storeAt(1));
    expect(screen.getByTestId("vim-summary").textContent).toBe(
      "Nenhuma rodada nesta configuração. Enter começa a primeira.",
    );
  });

  it("clicking the code puts the focus back on the key box", () => {
    setup(storeAt(1));
    box().blur();
    expect(document.activeElement).not.toBe(box());
    fireEvent.click(screen.getByTestId("vim-code"));
    expect(document.activeElement).toBe(box());
  });

  it("keys pressed during a composition are left to the browser", () => {
    setup(storeAt(3));
    const before = pos(cursor());
    expect(fireEvent.keyDown(box(), { key: "$", isComposing: true })).toBe(true);
    expect(pos(cursor())).toEqual(before);
  });

  it("text of an input event during a composition waits for its end", () => {
    setup(storeAt(3));
    const before = pos(cursor());
    fireEvent.input(box(), { target: { value: "$" }, isComposing: true });
    expect(pos(cursor())).toEqual(before);
    expect(box().value).toBe("$");
  });

  it("the line after a skipped target says it was skipped", () => {
    setup(storeAt(2));
    press("<Esc>");
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    const first = generateTarget(SEED, 0, 2);
    expect(screen.getByTestId("vim-last").textContent).toBe(
      `pulado · ótimo: ${String(first.minimum)} (${first.solution})`,
    );
  });

  it("the results screen shows the worst targets with their best solution", () => {
    setup(storeAt(1, 30));
    const first = generateTarget(SEED, 0, 1);
    press("<Esc><Esc>");
    press(first.solution);
    advance(31_000);
    const worst = within(screen.getByTestId("vim-worst"));
    const items = worst.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain(`ótimo: ${String(first.minimum)} (${first.solution})`);
    const keys = parseKeys(first.solution).length + 2;
    expect(screen.getByTestId("vim-efficiency").textContent).toBe(
      `${String(Math.round((first.minimum / keys) * 100))}%`,
    );
  });
});
