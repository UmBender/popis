// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import type { TrainingEvent } from "../stats/event";
import { DAY_MS } from "../stats/summary";
import { loadEvents, recordEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { saveTypingPace } from "../storage/typing-pace";
import { WEAK_BLOCK_MS, WEAK_BLOCKS_PER_ROUND } from "../typing/weak-round";
import { App } from "./App";
import { WeakTypingScreen } from "./WeakTypingScreen";

const NOW = Date.UTC(2026, 10, 22, 12);

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

function seedWeakStore(store: KeyValueStore = memoryStore()): KeyValueStore {
  const events: TrainingEvent[] = [
    // "qu" is slowest: 6 occurrences with 340 ms median
    ...Array.from({ length: 6 }, (_, k) => ({
      at: NOW - DAY_MS + k * 1000,
      drill: "typing.text" as const,
      config: "en-30s",
      kc: "word",
      ok: true,
      timeMs: 340,
      extra: { seed: 100 + k, i: 0, w: "qu", iv: [340], bad: [] },
    })),
    // "->" is second slowest: 6 occurrences with 290 ms median
    ...Array.from({ length: 6 }, (_, k) => ({
      at: NOW - 2 * DAY_MS + k * 1000,
      drill: "typing.weak" as const,
      config: "weak",
      kc: "typing.ngram.->",
      ok: true,
      timeMs: 290,
      extra: { seed: 200 + k, i: 0, w: "->", iv: [290], bad: [] },
    })),
  ];
  recordEvents(store, events, NOW);
  // Target 60 WPM => targetIntervalMs = 200 ms
  saveTypingPace(store, {
    version: 1,
    enabled: true,
    goal: 0.85,
    targets: { "text:en-30s": 60 },
  });
  return store;
}

function typeOneChar(box: HTMLElement, ch: string, stepMs: number) {
  advance(stepMs);
  fireEvent.change(box, { target: { value: ch } });
}

function typeWord(box: HTMLElement, word: string, stepMs: number) {
  for (const ch of word) {
    typeOneChar(box, ch, stepMs);
  }
  typeOneChar(box, " ", stepMs);
}

describe("WeakTypingScreen", () => {
  it("highlights the focused n-gram", () => {
    const store = seedWeakStore();
    let seed = 10;
    render(
      <WeakTypingScreen
        clock={clock}
        store={store}
        newSeed={() => ++seed}
        onBack={() => {}}
        onOpenText={() => {}}
      />,
    );

    expect(screen.getByTestId("weak-focus").textContent).toBe("qu");
    expect(screen.getByTestId("weak-block").textContent).toBe("1/5");

    const wordsEl = screen.getByTestId("weak-words");
    const highlighted = wordsEl.querySelectorAll('[data-weak-match="true"]');
    expect(highlighted.length).toBeGreaterThanOrEqual(4);
    // Every consecutive highlighted run spells "qu"
    const firstWordWithMatch = Array.from(wordsEl.querySelectorAll(".word")).find(
      (w) => w.querySelector('[data-weak-match="true"]') !== null,
    );
    expect(firstWordWithMatch?.textContent).toContain("qu");

    // Ghost caret starts hidden, appears as fake clock advances, hides when Ritmo-alvo is turned off
    const box = screen.getByRole("textbox", { name: "Texto digitado" });
    expect(wordsEl.querySelector('[data-ghost="true"]')).toBeNull();
    fireEvent.change(box, { target: { value: "a" } });
    advance(500);
    expect(wordsEl.querySelector('[data-ghost="true"]')).not.toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Ritmo-alvo" }));
    expect(wordsEl.querySelector('[data-ghost="true"]')).toBeNull();
  });

  it("result shows before and after per n-gram", () => {
    const store = seedWeakStore();
    let seed = 10;
    render(
      <WeakTypingScreen
        clock={clock}
        store={store}
        newSeed={() => ++seed}
        onBack={() => {}}
        onOpenText={() => {}}
      />,
    );

    // Block 1: type first two words fast (100 ms/char < 200 ms target) so "qu" graduates -> "->" enters
    const box = screen.getByRole("textbox", { name: "Texto digitado" });
    const firstWords = () =>
      Array.from(screen.getByTestId("weak-words").querySelectorAll(".word"))
        .slice(0, 3)
        .map((w) => w.textContent ?? "");

    for (const w of firstWords()) typeWord(box, w, 100);
    advance(WEAK_BLOCK_MS + 100);

    // Block 1 graduated "qu", so block 2 focuses "->"
    expect(screen.getByTestId("weak-block").textContent).toBe("2/5");
    expect(screen.getByTestId("weak-focus").textContent).toBe("->");
    expect(screen.getByTestId("weak-block-status").textContent).toContain("qu");

    // Remaining 4 blocks: type slower (250 ms/char > 200 ms target) so "->" stays until block 5 ends
    for (let block = 2; block <= WEAK_BLOCKS_PER_ROUND; block++) {
      const currentBox = screen.getByRole("textbox", { name: "Texto digitado" });
      for (const w of firstWords()) typeWord(currentBox, w, 250);
      advance(WEAK_BLOCK_MS + 100);
    }

    // Round finished: result shows before and after per n-gram
    expect(screen.getByTestId("result")).toBeTruthy();
    const table = screen.getByTestId("weak-results-table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toContain("qu");
    expect(rows[0]?.textContent).toContain("340 ms");
    expect(rows[0]?.textContent).toContain("100 ms");
    expect(rows[0]?.textContent).toContain("Formado");
    expect(rows[1]?.textContent).toContain("->");
    expect(rows[1]?.textContent).toContain("290 ms");
    expect(rows[1]?.textContent).toContain("250 ms");

    // typing.weak events were persisted with typing.ngram.<ngram>
    const weakEvs = loadEvents(store).filter((e) => e.drill === "typing.weak");
    expect(weakEvs.some((e) => e.kc === "typing.ngram.qu")).toBe(true);
    expect(weakEvs.some((e) => e.kc === "typing.ngram.->")).toBe(true);

    // Play again resets to block 1/5
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.getByTestId("weak-block").textContent).toBe("1/5");
  });

  it("no data shows the explanation and a link to Texto", () => {
    const store = memoryStore();
    let seed = 1;
    render(<App clock={clock} store={store} newSeed={() => ++seed} narrow={false} />);

    fireEvent.click(screen.getByRole("radio", { name: "Pontos fracos" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Pontos fracos");
    const empty = screen.getByTestId("weak-empty");
    expect(empty.textContent).toContain("Texto");

    fireEvent.click(within(empty).getByRole("button", { name: /Texto/ }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Texto");
  });

  it("supports keyboard editing, skip, restart, exit and composition", () => {
    const store = seedWeakStore();
    let seed = 10;
    const onBack = vi.fn();
    render(
      <WeakTypingScreen
        clock={clock}
        store={store}
        newSeed={() => ++seed}
        onBack={onBack}
        onOpenText={() => {}}
      />,
    );

    const box = screen.getByRole("textbox", { name: "Texto digitado" });
    fireEvent.click(screen.getByTestId("weak-words"));
    fireEvent.change(box, { target: { value: "xy" } });
    fireEvent.keyDown(box, { key: "Backspace" });
    fireEvent.keyDown(box, { key: "Backspace", ctrlKey: true });
    fireEvent.keyDown(box, { key: "Tab" });
    fireEvent.keyDown(box, { key: "Enter" });
    fireEvent.compositionEnd(box, { currentTarget: { value: "a" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.getByTestId("weak-time").textContent).toBe("30 s");

    fireEvent.change(box, { target: { value: "a" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("weak-time").textContent).toBe("30 s");

    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(screen.getByTestId("weak-block").textContent).toBe("1/5");

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
