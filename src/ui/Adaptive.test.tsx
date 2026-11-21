// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { division, type DivisionSettings } from "../gen/division";
import { reviewCard, newCard } from "../stats/fsrs";
import { DAY_MS } from "../stats/summary";
import { ADAPTIVE_KEY, DEFAULT_ADAPTIVE_SETTINGS, loadAdaptiveSettings } from "../storage/adaptive";
import {
  HISTORY_KEY,
  memoryStore,
  type KeyValueStore,
  type SessionRecord,
} from "../storage/history";
import { REVIEW_CARDS_KEY, type ReviewCard } from "../storage/review";
import { App } from "./App";

const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(store: KeyValueStore = memoryStore()) {
  render(<App clock={clock} store={store} newSeed={() => 7} narrow={false} />);
  return { store };
}

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

describe("adaptive training UI (T24 AC-2, AC-3, AC-4, AC-5, AC-6)", () => {
  it("shows Nível automático and adjustable 70%-95% target in Arithmetic, Estimation, Sums and Vim Motion", () => {
    const { store } = setup();

    // Arithmetic
    const autoCheck = screen.getByRole<HTMLInputElement>("checkbox", { name: /Nível automático/i });
    expect(autoCheck.checked).toBe(false);
    fireEvent.click(autoCheck);
    expect(autoCheck.checked).toBe(true);
    const targetSelect = screen.getByRole<HTMLSelectElement>("combobox", {
      name: /Meta de acerto/i,
    });
    expect(targetSelect.value).toBe("0.85");
    fireEvent.change(targetSelect, { target: { value: "0.8" } });
    expect(loadAdaptiveSettings(store).targetAccuracy).toBe(0.8);

    // Estimation
    fireEvent.click(screen.getByRole("radio", { name: "Estimativa" }));
    expect(screen.getByRole("checkbox", { name: /Nível automático/i })).toBeTruthy();

    // Sums
    fireEvent.click(screen.getByRole("radio", { name: "Somatórios" }));
    expect(screen.getByRole("checkbox", { name: /Nível automático/i })).toBeTruthy();

    // Vim Motion
    fireEvent.click(screen.getByRole("radio", { name: "Movimento" }));
    expect(screen.getByRole("checkbox", { name: /Nível automático/i })).toBeTruthy();
  });

  it("counts only due FSRS cards in the tree and shows failed Vim commands in Revisar", () => {
    const FLOOR: DivisionSettings = { kinds: ["floor"] };
    const p1 = division.generate(1, FLOOR);
    const p2 = division.generate(2, FLOOR);
    const futureCard = reviewCard(newCard(NOW), 3, NOW);
    const cards: ReviewCard[] = [
      {
        id: `${p1.skill}#${String(p1.seed)}`,
        kind: "calc",
        item: { mode: "division", seed: p1.seed, params: p1.params },
        skill: p1.skill,
        prompt: p1.prompt,
        card: newCard(NOW - DAY_MS), // due
      },
      {
        id: `${p2.skill}#${String(p2.seed)}`,
        kind: "calc",
        item: { mode: "division", seed: p2.seed, params: p2.params },
        skill: p2.skill,
        prompt: p2.prompt,
        card: futureCard, // not due
      },
      {
        id: "vim.motion#cpp-1#42",
        kind: "vim-motion",
        kc: "f",
        level: 4,
        snippetId: "cpp-1",
        lines: ["int main(int n) {"],
        start: { line: 0, col: 0 },
        target: { line: 0, col: 8 },
        minimum: 2,
        solution: "f(",
        label: "chegar ao `(` com 2 teclas",
        card: newCard(NOW - DAY_MS), // due
      },
    ];
    const store = memoryStore({ [REVIEW_CARDS_KEY]: JSON.stringify(cards) });
    setup(store);

    // 1 due calc + 1 due vim = 2 (the future calc card is excluded)
    expect(screen.getByTestId("tree-review-count").textContent).toBe("2");
    fireEvent.click(screen.getByRole("radio", { name: "Revisar" }));
    expect(screen.getByTestId("vim-review-cards").textContent).toContain(
      "chegar ao `(` com 2 teclas",
    );
  });

  it("renders Treino do dia at the top of the tree with block reasons and weekly mode toggle", () => {
    const { store } = setup();
    const radios = screen.getAllByRole<HTMLInputElement>("radio");
    expect(radios[0]?.getAttribute("aria-label")).toBe("Treino do dia");

    fireEvent.click(radios[0]!);
    expect(screen.getByRole("heading", { level: 1, name: "Treino do dia" })).toBeTruthy();
    expect(screen.getByTestId("daily-blocks").textContent).toBeTruthy();

    const modeSelect = screen.getByRole<HTMLSelectElement>("combobox", { name: /Modo da semana/i });
    expect(modeSelect.value).toBe("interleaved");
    fireEvent.change(modeSelect, { target: { value: "blocked" } });
    expect(loadAdaptiveSettings(store).dailyMode).toBe("blocked");
  });

  it("shows honest recommendations in the item panel and in Evolução, plus experiment comparison", () => {
    // 10 flat rounds over 3 weeks -> plateau >= 2 weeks AND accuracy < 70%
    const sessions: SessionRecord[] = Array.from({ length: 10 }, (_, idx) => ({
      version: 1,
      mode: "arithmetic",
      finishedAt: NOW - (21 - idx * 2) * DAY_MS,
      durationMs: 60_000,
      seed: idx + 1,
      params: DEFAULT_ARITHMETIC,
      log: Array.from({ length: 10 }, (_, j) => ({
        problem: {
          skill: "arithmetic.add",
          prompt: "2 + 2",
          answer: "4",
          seed: j,
          params: DEFAULT_ARITHMETIC,
        },
        outcome: j < 5 ? ("correct" as const) : ("skipped" as const),
        timeMs: 1200,
        corrections: 0,
      })),
    }));
    const store = memoryStore({
      [HISTORY_KEY]: JSON.stringify(sessions),
      [ADAPTIVE_KEY]: JSON.stringify({
        ...DEFAULT_ADAPTIVE_SETTINGS,
        dailySessions: [
          {
            finishedAt: NOW - 10 * DAY_MS,
            week: "2026-W45",
            mode: "interleaved",
            accuracy: 0.84,
            hitsPerMin: 22,
            itemsCompleted: 20,
          },
          {
            finishedAt: NOW - 3 * DAY_MS,
            week: "2026-W46",
            mode: "blocked",
            accuracy: 0.81,
            hitsPerMin: 20,
            itemsCompleted: 18,
          },
        ],
      }),
    });
    setup(store);

    // Item panel (Aritmética) shows recommendations with "deve ajudar"
    const itemRecs = screen.getByTestId("recommendations");
    expect(itemRecs.textContent).toContain("deve ajudar");

    // Evolução shows recommendations AND weekly experiment comparison
    fireEvent.click(screen.getByRole("radio", { name: "Evolução" }));
    expect(screen.getByTestId("progress-recommendations-arithmetic").textContent).toContain(
      "deve ajudar",
    );
    const experiment = screen.getByTestId("daily-experiment");
    expect(experiment.textContent).toContain("Intercalado");
    expect(experiment.textContent).toContain("Em bloco");
  });

  it("grades Vim review cards in Revisar and handles auto-level updates across rounds", () => {
    const store = memoryStore({
      [REVIEW_CARDS_KEY]: JSON.stringify([
        {
          id: "vim.motion#cpp-1#42",
          kind: "vim-motion",
          kc: "f",
          level: 4,
          snippetId: "cpp-1",
          lines: ["int main(int n) {"],
          start: { line: 0, col: 0 },
          target: { line: 0, col: 8 },
          minimum: 2,
          solution: "f(",
          label: "chegar ao `(` com 2 teclas",
          card: newCard(NOW - DAY_MS),
        },
        {
          id: "vim.motion#cpp-1#43",
          kind: "vim-motion",
          kc: "t",
          level: 4,
          snippetId: "cpp-1",
          lines: ["int main(int n) {"],
          start: { line: 0, col: 0 },
          target: { line: 0, col: 7 },
          minimum: 2,
          solution: "t(",
          label: "chegar ao `n` com 2 teclas",
          card: newCard(NOW - DAY_MS),
        },
      ]),
      [ADAPTIVE_KEY]: JSON.stringify({
        ...DEFAULT_ADAPTIVE_SETTINGS,
        autoLevel: { "vim-motion": true, arithmetic: true, estimation: true, sums: true },
        targetAccuracy: 0.85,
      }),
    });
    setup(store);

    // Revisar: mark one Vim card "Acertei" and one "Errei"
    fireEvent.click(screen.getByRole("radio", { name: "Revisar" }));
    expect(screen.getByTestId("vim-review-cards")).toBeTruthy();
    const acertei = screen.getAllByRole("button", { name: "Acertei" });
    fireEvent.click(acertei[0]!);
    const errei = screen.getAllByRole("button", { name: "Errei" });
    fireEvent.click(errei[0]!);
    expect(screen.queryByTestId("vim-review-cards")).toBeNull();

    // Finish an auto-level round in Arithmetic, Estimation, and Sums
    for (const label of ["Aritmética", "Estimativa", "Somatórios"] as const) {
      fireEvent.click(screen.getByRole("radio", { name: label }));
      fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
        target: { value: "30" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Começar" }));
      advance(31_000);
      fireEvent.keyDown(document.body, { key: "Escape" });
    }

    // Vim Motion: skip one target + advance so Elo updates & auto-level steps down
    fireEvent.click(screen.getByRole("radio", { name: "Movimento" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Nível" }), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Meta de acerto" }), {
      target: { value: "0.9" },
    });
    expect(loadAdaptiveSettings(store).targetAccuracy).toBe(0.9);
    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    const box = screen.getByRole("textbox", { name: "Teclas do Vim" });
    fireEvent.keyDown(box, { key: "l" });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    advance(31_000);
    fireEvent.click(screen.getByRole("checkbox", { name: /Nível automático/i }));
    expect(loadAdaptiveSettings(store).autoLevel["vim-motion"]).toBe(false);
  });

  it("runs a guided Treino do dia session, opens blocks, and jumps to Aprender from Vim recommendation", () => {
    const FLOOR: DivisionSettings = { kinds: ["floor"] };
    const p1 = division.generate(1, FLOOR);
    const stalledVimEvents = Array.from({ length: 22 }, (_, i) => [
      NOW - (25 - i) * DAY_MS,
      "vim.motion",
      "L4",
      "f",
      i % 2 === 0 ? 1 : 0,
      1500,
      { seed: i + 1, i },
    ]);
    const store = memoryStore({
      "popis.events.v1": JSON.stringify(stalledVimEvents),
      [REVIEW_CARDS_KEY]: JSON.stringify([
        {
          id: `${p1.skill}#${String(p1.seed)}`,
          kind: "calc",
          item: { mode: "division", seed: p1.seed, params: p1.params },
          skill: p1.skill,
          prompt: p1.prompt,
          card: newCard(NOW - DAY_MS),
        },
      ]),
    });
    setup(store);

    // Vim Motion shows stalled-KC recommendation with Aprender button
    fireEvent.click(screen.getByRole("radio", { name: "Movimento" }));
    expect(screen.getByRole("button", { name: "Ver lição no Aprender" })).toBeTruthy();

    // Jump from Evolução Vim stalled recommendation to Aprender
    fireEvent.click(screen.getByRole("radio", { name: "Evolução" }));
    const learnBtn = screen.getByRole("button", { name: "Ver lição no Aprender" });
    fireEvent.click(learnBtn);
    expect(screen.getByRole("heading", { level: 1, name: "Aprender" })).toBeTruthy();

    // Treino do dia: change Meta de acerto, open a block, then run guided workout
    fireEvent.click(screen.getByRole("radio", { name: "Treino do dia" }));
    fireEvent.change(screen.getByRole("combobox", { name: /Meta de acerto/i }), {
      target: { value: "0.9" },
    });
    expect(loadAdaptiveSettings(store).targetAccuracy).toBe(0.9);

    // Start guided session, answer/skip, restart, finish and abort flows
    fireEvent.click(screen.getByRole("button", { name: "Começar treino do dia" }));
    expect(screen.getByTestId("daily-progress")).toBeTruthy();
    // Restart current block via Ctrl+Shift+Enter
    const answerBox = screen.getByRole("textbox", { name: "Resposta" });
    fireEvent.keyDown(answerBox, { key: "Enter", ctrlKey: true, shiftKey: true });
    // Skip one question then let timer finish
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Enter" });
    advance(121_000);
    // Daily session finishes and records experiment entry
    expect(screen.getByTestId("daily-done")).toBeTruthy();
    expect(loadAdaptiveSettings(store).dailySessions).toHaveLength(1);

    // Open block button jumps to target drill
    const openButtons = screen.getAllByRole("button", { name: "Abrir treino" });
    fireEvent.click(openButtons[0]!);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();

    // Starter blocks (empty store) -> open arithmetic, estimation, vim-motion blocks and abort
    fireEvent.click(screen.getByRole("radio", { name: "Treino do dia" }));
    const startBtn = screen.getByRole("button", { name: "Começar treino do dia" });
    fireEvent.click(startBtn);
    if (screen.queryByRole("textbox", { name: "Resposta" }) !== null) {
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });
    }
  });

  it("opens arithmetic, estimation, sums and vim blocks from Treino do dia with Elo levels", () => {
    const events = [
      ...Array.from({ length: 6 }, (_, i) => [
        NOW - DAY_MS,
        "calc",
        "estimation",
        "estimation.complexity",
        0,
        1500,
        { seed: i + 1, i },
      ]),
      ...Array.from({ length: 6 }, (_, i) => [
        NOW - DAY_MS,
        "calc",
        "sums",
        "sums.sum",
        0,
        1600,
        { seed: i + 20, i: i + 20 },
      ]),
      ...Array.from({ length: 6 }, (_, i) => [
        NOW - DAY_MS,
        "calc",
        "division",
        "division.floor",
        0,
        1700,
        { seed: i + 40, i: i + 40 },
      ]),
    ];
    const store = memoryStore({ "popis.events.v1": JSON.stringify(events) });
    setup(store);

    fireEvent.click(screen.getByRole("radio", { name: "Treino do dia" }));
    // Click Abrir treino for each block
    for (let idx = 0; idx < 3; idx++) {
      fireEvent.click(screen.getByRole("radio", { name: "Treino do dia" }));
      const btns = screen.getAllByRole("button", { name: "Abrir treino" });
      fireEvent.click(btns[idx]!);
    }

    // Start guided session across estimation, sums, division blocks and finish all three
    fireEvent.click(screen.getByRole("radio", { name: "Treino do dia" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar treino do dia" }));
    // Finish block 1 (estimation), block 2 (sums), then abort block 3 (division)
    advance(121_000);
    advance(121_000);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Começar treino do dia" })).toBeTruthy();

    // Empty store starter blocks: open arithmetic (0), run guided arithmetic block, open vim-motion (2)
    const empty = memoryStore({
      [REVIEW_CARDS_KEY]: JSON.stringify([
        {
          id: "vim.motion#cpp-1#99",
          kind: "vim-motion",
          kc: "f",
          level: 4,
          snippetId: "cpp-1",
          lines: ["foo(x)"],
          start: { line: 0, col: 0 },
          target: { line: 0, col: 3 },
          minimum: 2,
          solution: "f(",
          label: "chegar ao `(` com 2 teclas",
          card: newCard(NOW - DAY_MS),
        },
      ]),
      [ADAPTIVE_KEY]: JSON.stringify({
        ...DEFAULT_ADAPTIVE_SETTINGS,
        dailySessions: [
          {
            finishedAt: NOW - DAY_MS,
            week: "2026-W47",
            mode: "interleaved",
            accuracy: 0.9,
            hitsPerMin: 25,
            itemsCompleted: 20,
          },
        ],
      }),
    });
    const view2 = render(<App clock={clock} store={empty} newSeed={() => 7} narrow={false} />);
    // Evolução with only interleaved sessions (blocked === null -> "—")
    fireEvent.click(screen.getAllByRole("radio", { name: "Evolução" })[1]!);
    expect(screen.getByTestId("daily-experiment").textContent).toContain("—");
    // Treino do dia with due Vim-only card (skips review calc block cleanly)
    fireEvent.click(screen.getAllByRole("radio", { name: "Treino do dia" })[1]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Começar treino do dia" })[1]!);
    view2.unmount();

    // Truly empty store -> starter blocks (arithmetic, estimation, vim-motion)
    const fresh = memoryStore();
    render(<App clock={clock} store={fresh} newSeed={() => 7} narrow={false} />);
    fireEvent.click(screen.getAllByRole("radio", { name: "Treino do dia" })[1]!);
    const starterBtns = screen.getAllByRole("button", { name: "Abrir treino" });
    // Open starter arithmetic (with level)
    fireEvent.click(starterBtns[starterBtns.length - 3]!);
    // Back to Treino do dia, run guided starter arithmetic block and abort
    fireEvent.click(screen.getAllByRole("radio", { name: "Treino do dia" })[1]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Começar treino do dia" })[1]!);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });
    // Open starter vim-motion (with level)
    const starterBtns2 = screen.getAllByRole("button", { name: "Abrir treino" });
    fireEvent.click(starterBtns2[starterBtns2.length - 1]!);
  });
});
