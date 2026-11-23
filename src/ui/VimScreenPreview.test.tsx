// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { recordEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import {
  appendVimEditResult,
  appendVimResult,
  loadVimEditResults,
  loadVimEditSettings,
  loadVimResults,
  loadVimSettings,
  VIM_EDIT_SETTINGS_KEY,
  VIM_SETTINGS_KEY,
  type VimEditResult,
  type VimResult,
} from "../storage/vim";
import { generateEdit, type EditKind } from "../vim/drills/edit";
import { generateTarget } from "../vim/drills/target";
import { parseKeys } from "../vim/keys";
import { AUTO_WINDOW, parseSolutionBlocks, type PreviewMode } from "../vim/preview";
import { LessonModal } from "./vim/Preview";
import { VimScreen } from "./VimScreen";

const SEED = 21;

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

const EVENT_KEYS: Record<string, string> = {
  "<CR>": "Enter",
  "<Esc>": "Escape",
  "<BS>": "Backspace",
};

const box = () => screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Teclas do Vim" });

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

function motionStore(level: number, durationS = 60, preview?: PreviewMode): KeyValueStore {
  return memoryStore({
    [VIM_SETTINGS_KEY]: JSON.stringify({
      level,
      durationS,
      ...(preview !== undefined ? { preview } : {}),
    }),
  });
}

function editStore(
  kinds: readonly EditKind[],
  durationS = 60,
  preview?: PreviewMode,
): KeyValueStore {
  return memoryStore({
    [VIM_EDIT_SETTINGS_KEY]: JSON.stringify({
      drill: "edit",
      durationS,
      kinds,
      ...(preview !== undefined ? { preview } : {}),
    }),
  });
}

function renderVim(store: KeyValueStore, seed = SEED) {
  render(<VimScreen clock={clock} store={store} newSeed={() => seed} onBack={vi.fn()} />);
  return store;
}

function motionResult(over: Partial<VimResult> = {}): VimResult {
  return {
    version: 1,
    level: 4,
    durationS: 60,
    seed: 1,
    reached: 10,
    skipped: 0,
    efficiency: 0.9,
    finishedAt: 100,
    ...over,
  };
}

function editResult(over: Partial<VimEditResult> = {}): VimEditResult {
  return {
    version: 1,
    kind: "edit",
    durationS: 60,
    seed: 1,
    reached: 8,
    skipped: 0,
    efficiency: 1,
    finishedAt: 100,
    ...over,
  };
}

describe("VimScreen optimal preview — Motion (T21 AC-1..AC-6)", () => {
  it("defaults to Automática with no Vim results and Desligada when results exist, and saves choice", () => {
    const fresh = renderVim(motionStore(4));
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Prévia do ótimo" });
    expect(select.value).toBe("auto");
    expect(screen.getByTestId("vim-preview")).toBeTruthy();

    fireEvent.change(select, { target: { value: "stuck" } });
    expect(loadVimSettings(fresh).preview).toBe("stuck");
    expect(screen.queryByTestId("vim-preview")).toBeNull();
  });

  it("defaults to Desligada when the store already has Vim results", () => {
    const store = motionStore(4);
    appendVimResult(store, motionResult());
    renderVim(store);
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Prévia do ótimo" });
    expect(select.value).toBe("off");
    expect(screen.queryByTestId("vim-preview")).toBeNull();
  });

  it("Sempre shows blocks above code with next/done states, descriptions on focus/hover and waypoints", () => {
    renderVim(motionStore(2, 60, "always"));
    const first = generateTarget(SEED, 0, 2);
    const expectedBlocks = parseSolutionBlocks(first.solution);
    const preview = screen.getByTestId("vim-preview");
    const blocks = within(preview).getAllByTestId("vim-preview-block");
    expect(blocks.map((b) => b.textContent)).toEqual(expectedBlocks.map((b) => b.text));
    expect(blocks[0]?.dataset["state"]).toBe("next");

    // Hover and focus show one-line command description from levelHelp.
    fireEvent.mouseEnter(blocks[0] as HTMLElement);
    expect(screen.getByTestId("vim-preview-desc").textContent).toContain(
      expectedBlocks[0]?.description ?? "",
    );
    fireEvent.mouseLeave(blocks[0] as HTMLElement);
    fireEvent.focus(blocks[0] as HTMLElement);
    expect(screen.getByTestId("vim-preview-desc").textContent).toContain(
      expectedBlocks[0]?.description ?? "",
    );
    fireEvent.blur(blocks[0] as HTMLElement);
    // The line stays reserved but empty, so showing it never moves the layout (T36).
    expect(screen.getByTestId("vim-preview-desc").textContent).toBe("");

    // Multi-block solution shows waypoints without covering the target.
    if (expectedBlocks.length > 1) {
      expect(screen.getAllByTestId("vim-waypoint").length).toBeGreaterThan(0);
      const targetEl = screen.getByTestId("vim-target");
      expect(targetEl.classList.contains("vim-waypoint")).toBe(false);

      // Typing the first block marks it done and highlights the second block as next.
      press(expectedBlocks[0]?.text ?? "");
      const updated = within(screen.getByTestId("vim-preview")).getAllByTestId("vim-preview-block");
      expect(updated[0]?.dataset["state"]).toBe("done");
      expect(updated[1]?.dataset["state"]).toBe("next");
    }
  });

  it("recalculates preview from current position when leaving the optimal path", () => {
    renderVim(motionStore(4, 60, "always"));
    const first = generateTarget(SEED, 0, 4);
    const beforeText = screen.getByTestId("vim-preview").textContent;
    // Press a key guaranteed to differ from the optimal first key (or move off-path).
    const wrongKey = first.solution.startsWith("j") ? "k" : "j";
    press(wrongKey);
    const afterBlocks = within(screen.getByTestId("vim-preview")).getAllByTestId(
      "vim-preview-block",
    );
    expect(afterBlocks.length).toBeGreaterThan(0);
    expect(afterBlocks[0]?.dataset["state"]).toBe("next");
    // Replaying the recalculated preview reaches the target and advances index to 1.
    const recalculated = afterBlocks.map((b) => b.textContent ?? "").join("");
    expect(recalculated.length).toBeGreaterThan(0);
    press(recalculated);
    expect(screen.getByTestId("vim-code").dataset["targetIndex"]).toBe("1");
    expect(beforeText).toBeTruthy();
  });

  it("Ao travar reveals preview after 2 extra keys or 5 s idle", () => {
    renderVim(motionStore(1, 60, "stuck"));
    const first = generateTarget(SEED, 0, 1);
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    // 5 seconds idle after starting the round reveals the preview.
    press("<Esc>");
    advance(4900);
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    advance(200);
    expect(screen.getByTestId("vim-preview")).toBeTruthy();

    // Skip to next target: preview hides again, then appears after minimum + 2 keys.
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    const second = generateTarget(SEED, 1, 1);
    for (let i = 0; i < second.minimum + 1; i++) press("<Esc>");
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    press("<Esc>");
    expect(screen.getByTestId("vim-preview")).toBeTruthy();
    expect(first.minimum).toBeGreaterThan(0);
  });

  it("Automática fades to Ao travar once the command has 20 targets at >= 85% efficiency", () => {
    const store = motionStore(4, 60, "auto");
    const first = generateTarget(SEED, 0, 4);
    const events = Array.from({ length: AUTO_WINDOW }, (_, i) => ({
      at: 1000 + i,
      drill: "vim.motion" as const,
      config: "L4",
      kc: "f",
      ok: true,
      timeMs: 800,
      extra: {
        seed: 100 + i,
        i,
        keys: first.minimum,
        min: first.minimum,
        sol: first.solution,
        skipped: false,
        snippet: first.snippetId,
      },
    }));
    recordEvents(store, events, 5000);
    renderVim(store);
    // Mastered commands fade to "Ao travar" -> hidden initially.
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    press("<Esc>");
    advance(5100);
    expect(screen.getByTestId("vim-preview")).toBeTruthy();
  });

  it("Ctrl+P shows preview once even when off and marks only that target as assisted", () => {
    const store = renderVim(motionStore(4, 30, "off"));
    const first = generateTarget(SEED, 0, 4);
    const second = generateTarget(SEED, 1, 4);
    expect(screen.queryByTestId("vim-preview")).toBeNull();

    const prevented = !fireEvent.keyDown(box(), { key: "p", ctrlKey: true });
    expect(prevented).toBe(true);
    expect(screen.getByTestId("vim-preview")).toBeTruthy();
    press(first.solution);

    // Next target hides preview again; going off-path then pressing Ctrl+P recalculates from current pos.
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    const wrong = second.solution.startsWith("j") ? "k" : "j";
    press(wrong);
    fireEvent.keyDown(box(), { key: "p", ctrlKey: true });
    const recalc = within(screen.getByTestId("vim-preview"))
      .getAllByTestId("vim-preview-block")
      .map((b) => b.textContent ?? "")
      .join("");
    press(recalc);
    // Third target finishes unassisted.
    const third = generateTarget(SEED, 2, 4);
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    press(third.solution);

    advance(31_000);
    expect(screen.getByTestId("vim-with-preview").textContent).toBe("2");
    expect(screen.getByTestId("vim-without-preview").textContent).toBe("1");
    expect(loadVimResults(store)[0]?.assisted).toBe(true);
  });

  it("excludes assisted rounds from history best/mean and shows how many were excluded", () => {
    const store = motionStore(4, 60, "off");
    appendVimResult(store, motionResult({ seed: 1, reached: 10, assisted: false }));
    appendVimResult(store, motionResult({ seed: 2, reached: 40, assisted: true }));
    appendVimResult(store, motionResult({ seed: 3, reached: 50, assisted: true }));
    renderVim(store);
    const summary = screen.getByTestId("vim-summary").textContent ?? "";
    expect(summary).toContain("melhor 10 alvos");
    expect(summary).toContain("média 10 alvos");
    expect(summary).toContain("2 rodadas assistidas fora");
  });

  it("clicking a command block opens its T20 lesson modal, pauses time, and resumes the round", () => {
    renderVim(motionStore(4, 30, "always"));
    const first = generateTarget(SEED, 0, 4);
    press("<Esc>");
    advance(5000);
    expect(screen.getByTestId("vim-time").textContent).toBe("25 s");

    const block = within(screen.getByTestId("vim-preview")).getAllByTestId(
      "vim-preview-block",
    )[0] as HTMLElement;
    fireEvent.click(block);
    const modal = screen.getByTestId("vim-lesson-modal");
    expect(modal.getAttribute("role")).toBe("dialog");

    // Advancing 10 seconds while paused must NOT reduce remaining time; keys and Ctrl+P are ignored.
    press("l");
    fireEvent.keyDown(box(), { key: "p", ctrlKey: true });
    advance(10_000);
    expect(screen.getByTestId("vim-time").textContent).toBe("25 s");

    // Closing returns to the exact same target and restarts the clock from 25 s.
    fireEvent.click(within(modal).getByRole("button", { name: /Voltar para a rodada/i }));
    expect(screen.queryByTestId("vim-lesson-modal")).toBeNull();
    expect(screen.getByTestId("vim-code").dataset["targetIndex"]).toBe("0");
    expect(screen.getByTestId("vim-target").dataset["solution"]).toBe(first.solution);
    expect(document.activeElement).toBe(box());

    advance(2000);
    expect(screen.getByTestId("vim-time").textContent).toBe("23 s");
  });
});

describe("VimScreen optimal preview — Edit (T21 AC-1..AC-6)", () => {
  it("offers Prévia do ótimo in Edit, defaults by history, supports Ctrl+P, recalculates, pauses on lesson and separates results", () => {
    const fresh = renderVim(editStore(["change-parens"], 30));
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Prévia do ótimo" });
    expect(select.value).toBe("auto");
    expect(screen.getByTestId("vim-preview")).toBeTruthy();

    // Switch to off and persist.
    fireEvent.change(select, { target: { value: "off" } });
    expect(loadVimEditSettings(fresh).preview).toBe("off");
    expect(screen.queryByTestId("vim-preview")).toBeNull();

    // Ctrl+P reveals preview once on edit 0.
    fireEvent.keyDown(box(), { key: "p", ctrlKey: true });
    expect(screen.getByTestId("vim-preview")).toBeTruthy();

    // Hover shows description from EDIT_HELP.
    const firstBlock = within(screen.getByTestId("vim-preview")).getAllByTestId(
      "vim-preview-block",
    )[0] as HTMLElement;
    fireEvent.mouseEnter(firstBlock);
    expect(screen.getByTestId("vim-preview-desc").textContent).toBeTruthy();

    // Clicking block pauses timer and opens lesson dialog.
    press("j");
    advance(4000);
    expect(screen.getByTestId("vim-time").textContent).toBe("26 s");
    const recalcBlocks = within(screen.getByTestId("vim-preview")).getAllByTestId(
      "vim-preview-block",
    );
    fireEvent.click(recalcBlocks[0] as HTMLElement);
    expect(screen.getByTestId("vim-lesson-modal")).toBeTruthy();
    press("l");
    fireEvent.keyDown(box(), { key: "p", ctrlKey: true });
    fireEvent.keyDown(window, { key: "a" });
    advance(8000);
    expect(screen.getByTestId("vim-time").textContent).toBe("26 s");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("vim-lesson-modal")).toBeNull();

    // Complete edit 0 using the recalculated preview sequence.
    const plan = within(screen.getByTestId("vim-preview"))
      .getAllByTestId("vim-preview-block")
      .map((b) => b.textContent ?? "")
      .join("");
    press(plan);
    expect(screen.getByTestId("vim-code").dataset["editIndex"]).toBe("1");

    // Edit 1 has no preview (option is off) and completes unassisted.
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    const second = generateEdit(SEED, 1, ["change-parens"]);
    press(second.reference);
    expect(screen.getByTestId("vim-code").dataset["editIndex"]).toBe("2");

    advance(27_000);
    expect(screen.getByTestId("vim-with-preview").textContent).toBe("1");
    expect(screen.getByTestId("vim-without-preview").textContent).toBe("1");
    expect(loadVimEditResults(fresh)[0]?.assisted).toBe(true);
  });

  it("excludes assisted edit rounds from history summary and shows excluded count", () => {
    const store = editStore(["delete-line"], 60, "off");
    appendVimEditResult(store, editResult({ seed: 1, reached: 5, assisted: false }));
    appendVimEditResult(store, editResult({ seed: 2, reached: 30, assisted: true }));
    renderVim(store);
    const summary = screen.getByTestId("vim-summary").textContent ?? "";
    expect(summary).toContain("melhor 5 edições");
    expect(summary).toContain("1 rodada assistida fora");
  });

  it("Edit recalculates dirty plan on Ctrl+P and on 5 s stuck idle", () => {
    renderVim(editStore(["delete-line"], 60, "stuck"));
    // Move off-path while preview is hidden, then wait 5 s for stuck idle to trigger recalculation.
    press("j");
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    advance(5100);
    expect(screen.getByTestId("vim-preview")).toBeTruthy();

    // Skip to edit 1, move off-path while hidden, then trigger Ctrl+P to recalculate dirty plan.
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(screen.queryByTestId("vim-preview")).toBeNull();
    press("j");
    fireEvent.keyDown(box(), { key: "p", ctrlKey: true });
    expect(screen.getByTestId("vim-preview")).toBeTruthy();
  });

  it("LessonModal renders null for an unknown lesson id", () => {
    const { container } = render(<LessonModal lessonId="nonexistent" onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
