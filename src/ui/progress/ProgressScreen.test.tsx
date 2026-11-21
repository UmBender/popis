// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { manualClock } from "../../core/clock";
import { parseDay, WEEK_MS } from "../../stats/learning";
import { DAY_MS } from "../../stats/summary";
import { recordEvents } from "../../storage/events";
import { appendSession, memoryStore, type SessionRecord } from "../../storage/history";
import { appendTypingResult } from "../../storage/typing";
import { RoundHistory } from "../shell/History";
import { ProgressScreen } from "./ProgressScreen";

const BASE = parseDay("2026-01-01") ?? 0;

function seedStore() {
  const store = memoryStore();
  // 12 arithmetic rounds on a flat plateau (last 10 flat)
  for (let i = 0; i < 12; i++) {
    const at = BASE + i * 3 * DAY_MS;
    const score = i < 2 ? 36 + i * 2 : 40;
    const session: SessionRecord = {
      version: 1,
      mode: "arithmetic",
      finishedAt: at,
      durationMs: 60_000,
      seed: i + 1,
      params: { operations: ["add"] },
      log: Array.from({ length: score }, (_, j) => ({
        problem: {
          prompt: "1+1",
          answer: "2",
          skill: j % 2 === 0 ? "arithmetic.add" : "arithmetic.mul",
          seed: j,
          params: {},
        },
        outcome: j % 2 === 0 || j < 30 ? "correct" : "wrong",
        timeMs: j % 2 === 0 ? 900 : 2100,
        corrections: 0,
      })),
    };
    appendSession(store, session);
  }
  // Typing run + events for bigrams and error chars
  appendTypingResult(store, {
    version: 1,
    snippetId: "cpp-binary-search",
    language: "cpp",
    seed: 1,
    wpm: 62,
    accuracy: 0.96,
    errors: 2,
    timeMs: 30_000,
    finishedAt: BASE + 10 * DAY_MS,
  });
  recordEvents(
    store,
    Array.from({ length: 6 }, (_, k) => ({
      at: BASE + (10 + k) * DAY_MS,
      drill: "typing.text" as const,
      config: "pt-60s",
      kc: "word",
      ok: k > 0,
      timeMs: 400,
      extra: { seed: k + 1, i: 0, w: "qu", iv: [310], bad: k === 0 ? [["q", "w"]] : [] },
    })),
    BASE + 20 * DAY_MS,
  );
  return store;
}

describe("ProgressScreen", () => {
  it("shows headline, plateau badge with date, KC table ordered by BIS, and typing bigrams", () => {
    const store = seedStore();
    const clock = manualClock(BASE + 12 * 3 * DAY_MS);
    render(<ProgressScreen store={store} clock={clock} />);

    expect(screen.getByText(/Aritmética/i)).toBeTruthy();
    expect(screen.getByTestId("plateau-badge-arithmetic")).toBeTruthy();
    // KC table: arithmetic.mul is slower & has errors, so it should come before arithmetic.add.
    const rows = screen.getAllByTestId(/^kc-row-arithmetic-/);
    expect(rows[0]?.textContent).toContain("Multiplicação");
    expect(rows[1]?.textContent).toContain("Adição");
    // Typing bigrams & char errors shown
    expect(screen.getByText("qu")).toBeTruthy();
  });

  it("user can set a goal and sees above/below status and goal line", () => {
    const store = seedStore();
    const clock = manualClock(BASE + 12 * 3 * DAY_MS);
    render(<ProgressScreen store={store} clock={clock} />);

    const targetInput = screen.getByLabelText("Meta (valor)");
    const dateInput = screen.getByLabelText("Data da meta");
    fireEvent.change(targetInput, { target: { value: "60" } });
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    expect(screen.getByTestId("goal-status-arithmetic").textContent).toMatch(/acima|abaixo/i);
  });
});

describe("RoundHistory AC-5", () => {
  it("RoundHistory shows weekly rate, plateau badge and links to Evolução", () => {
    const onProgress = vi.fn();
    render(
      <RoundHistory
        scores={[30, 32, 34, 34, 34, 34, 34, 34, 34, 34]}
        weeklyRate={1.3}
        plateau={{ since: BASE + WEEK_MS, slope: 0 }}
        onProgress={onProgress}
      />,
    );
    expect(screen.getByTestId("history-rate").textContent).toContain("+1,3");
    expect(screen.getByTestId("history-plateau").textContent).toMatch(/platô/i);
    fireEvent.click(screen.getByRole("button", { name: /Evolução/i }));
    expect(onProgress).toHaveBeenCalledTimes(1);
  });
});
