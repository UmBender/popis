// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { division, type DivisionSettings } from "../gen/division";
import { reviewCard, newCard } from "../stats/fsrs";
import { DAY_MS } from "../stats/summary";
import {
  ADAPTIVE_KEY,
  DEFAULT_ADAPTIVE_SETTINGS,
  loadAdaptiveSettings,
} from "../storage/adaptive";
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
  clock = manualClock(0, NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(store: KeyValueStore = memoryStore()) {
  render(<App clock={clock} store={store} newSeed={() => 7} narrow={false} />);
  return { store };
}

describe("adaptive training UI (T24 AC-2, AC-3, AC-4, AC-5, AC-6)", () => {
  it("shows Nível automático and adjustable 70%-95% target in Arithmetic, Estimation, Sums and Vim Motion", () => {
    const { store } = setup();

    // Arithmetic
    const autoCheck = screen.getByRole<HTMLInputElement>("checkbox", { name: /Nível automático/i });
    expect(autoCheck.checked).toBe(false);
    fireEvent.click(autoCheck);
    expect(autoCheck.checked).toBe(true);
    const targetSelect = screen.getByRole<HTMLSelectElement>("combobox", { name: /Meta de acerto/i });
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
});
