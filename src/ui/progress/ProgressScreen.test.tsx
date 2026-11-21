// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { manualClock } from "../../core/clock";
import { parseDay, WEEK_MS } from "../../stats/learning";
import { DAY_MS } from "../../stats/summary";
import { recordEvents } from "../../storage/events";
import { appendSession, memoryStore, type SessionRecord } from "../../storage/history";
import { appendTextResult } from "../../storage/text-typing";
import { appendTypingResult } from "../../storage/typing";
import { appendVimEditResult, appendVimResult } from "../../storage/vim";
import { DEFAULT_TEXT_SETTINGS, textConfigKey } from "../../typing/text";
import { App } from "../App";
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
        outcome: j % 2 === 0 || j < 30 ? "correct" : "skipped",
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
      extra: {
        seed: k + 1,
        i: 0,
        w: "qu;",
        iv: [310, 290],
        bad:
          k === 0
            ? [
                ["q", "w"],
                [";", ":"],
              ]
            : [],
      },
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

    expect(screen.getByTestId("progress-headline-arithmetic").textContent).toContain("Aritmética");
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

    const section = within(screen.getByTestId("progress-section-arithmetic"));
    const targetInput = section.getByLabelText("Meta (valor)");
    const dateInput = section.getByLabelText("Data da meta");
    // Target below current score -> "Acima da linha da meta"
    fireEvent.change(targetInput, { target: { value: "30" } });
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });
    fireEvent.click(section.getByRole("button", { name: "Salvar meta" }));
    expect(screen.getByTestId("goal-status-arithmetic").textContent).toContain("Acima");

    // Target well above current score -> "Abaixo da linha da meta"
    fireEvent.change(targetInput, { target: { value: "80" } });
    fireEvent.click(section.getByRole("button", { name: "Salvar meta" }));
    expect(screen.getByTestId("goal-status-arithmetic").textContent).toContain("Abaixo");

    // Removing the goal clears the status.
    fireEvent.click(section.getByRole("button", { name: "Remover meta" }));
    expect(screen.queryByTestId("goal-status-arithmetic")).toBeNull();

    // Submitting invalid goal values does nothing.
    fireEvent.change(targetInput, { target: { value: "50" } });
    fireEvent.change(dateInput, { target: { value: "" } });
    fireEvent.submit(section.getByRole("button", { name: "Salvar meta" }).closest("form")!);
    expect(screen.queryByTestId("goal-status-arithmetic")).toBeNull();
  });

  it("shows empty state with no data, supports focusItem ordering, preloaded goals and config switching", () => {
    const emptyStore = memoryStore();
    const clock = manualClock(BASE + 12 * 3 * DAY_MS);
    const { unmount } = render(<ProgressScreen store={emptyStore} clock={clock} />);
    expect(screen.getByTestId("progress-empty")).toBeTruthy();
    unmount();

    const store = seedStore();
    // Add a second arithmetic config (120s) to test config switching + preloaded goal.
    appendSession(store, {
      version: 1,
      mode: "arithmetic",
      finishedAt: BASE + 5 * DAY_MS,
      durationMs: 120_000,
      seed: 99,
      params: { operations: ["add"] },
      log: [],
    });
    const firstRender = render(<ProgressScreen store={store} clock={clock} focusItem="typing" />);
    const sections = screen.getAllByTestId(/^progress-section-/);
    expect(sections[0]?.getAttribute("data-testid")).toBe("progress-section-typing");
    const arithSection = within(screen.getByTestId("progress-section-arithmetic"));
    // Save a goal on the 60s config, switch to 120s, switch back to 60s, then remount to hit preloaded goal.
    fireEvent.change(arithSection.getByLabelText("Meta (valor)"), { target: { value: "55" } });
    fireEvent.change(arithSection.getByLabelText("Data da meta"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.click(arithSection.getByRole("button", { name: "Salvar meta" }));
    fireEvent.click(arithSection.getByRole("button", { name: /120 s/ }));
    expect(screen.getByTestId("progress-headline-arithmetic").textContent).toContain("120 s");
    fireEvent.click(arithSection.getByRole("button", { name: /60 s/ }));
    expect(arithSection.getByLabelText<HTMLInputElement>("Meta (valor)").value).toBe("55");
    firstRender.unmount();

    render(<ProgressScreen store={store} clock={clock} />);
    expect(
      within(screen.getByTestId("progress-section-arithmetic")).getByLabelText<HTMLInputElement>(
        "Meta (valor)",
      ).value,
    ).toBe("55");
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

  it("App navigates to Evolução from every drill history link", () => {
    const store = memoryStore();
    const clock = manualClock(BASE + 15 * DAY_MS);
    appendSession(store, {
      version: 1,
      mode: "arithmetic",
      finishedAt: BASE + 10 * DAY_MS,
      durationMs: 120_000,
      seed: 1,
      params: {
        operations: ["add", "sub", "mul", "div"],
        addLeft: { min: 2, max: 100 },
        addRight: { min: 2, max: 100 },
        mulLeft: { min: 2, max: 12 },
        mulRight: { min: 2, max: 100 },
      },
      log: [],
    });
    appendTypingResult(store, {
      version: 1,
      snippetId: "cpp-bfs",
      language: "cpp",
      seed: 1,
      wpm: 50,
      accuracy: 0.95,
      errors: 1,
      timeMs: 20_000,
      finishedAt: BASE + 10 * DAY_MS,
    });
    appendTextResult(store, {
      version: 1,
      config: textConfigKey(DEFAULT_TEXT_SETTINGS),
      seed: 1,
      wpm: 55,
      raw: 56,
      accuracy: 0.98,
      chars: { correct: 50, incorrect: 1, extra: 0, missed: 0 },
      timeMs: 30_000,
      finishedAt: BASE + 10 * DAY_MS,
    });
    appendVimResult(store, {
      version: 1,
      kind: "motion",
      level: 1,
      durationS: 60,
      seed: 1,
      reached: 10,
      skipped: 0,
      efficiency: 0.9,
      finishedAt: BASE + 10 * DAY_MS,
    });
    appendVimEditResult(store, {
      version: 1,
      kind: "edit",
      durationS: 60,
      seed: 2,
      reached: 8,
      skipped: 0,
      efficiency: 0.9,
      finishedAt: BASE + 10 * DAY_MS,
    });

    render(<App clock={clock} store={store} newSeed={() => 1} narrow={false} />);
    for (const [label, expectedSection] of [
      ["Aritmética", "progress-section-arithmetic"],
      ["Código", "progress-section-typing"],
      ["Texto", "progress-section-text"],
      ["Movimento", "progress-section-vim-motion"],
      ["Edição", "progress-section-vim-edit"],
    ] as const) {
      fireEvent.click(screen.getByRole("radio", { name: label }));
      fireEvent.click(screen.getByRole("button", { name: "Evolução" }));
      const first = screen.getAllByTestId(/^progress-section-/)[0];
      expect(first?.getAttribute("data-testid")).toBe(expectedSection);
    }
  });
});
