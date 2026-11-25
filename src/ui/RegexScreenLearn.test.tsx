// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { REGEX_LESSONS, REGEX_UNITS } from "../regex/curriculum";
import type { RegexItem } from "../regex/types";
import { memoryStore } from "../storage/history";
import { loadRegexCompleted } from "../storage/regex-learn";
import { App } from "./App";

// T45 AC-6: Regex Aprender curriculum UI — 9 units, animated highlight example,
// adaptive fading across 3 exercises, persistence in popis.regex-learn, and Treinar jump.

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function solveExercise(ex: RegexItem) {
  if (ex.kind === "casar" || ex.kind === "extrair") {
    const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Expressão regular" });
    fireEvent.change(box, { target: { value: ex.canonical } });
    fireEvent.keyDown(box, { key: "Enter" });
  } else if (ex.kind === "trocar") {
    const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Expressão regular" });
    const repl = screen.getByRole<HTMLInputElement>("textbox", { name: "Substituição" });
    fireEvent.change(box, { target: { value: ex.canonical } });
    fireEvent.change(repl, { target: { value: ex.canonicalReplacement } });
    fireEvent.keyDown(repl, { key: "Enter" });
  } else {
    const boxes = screen.getAllByRole<HTMLInputElement>("checkbox", { name: /Linha \d/ });
    ex.expected.forEach((shouldMatch, idx) => {
      if (shouldMatch && boxes[idx] !== undefined) fireEvent.click(boxes[idx]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Conferir" }));
  }
}

describe("RegexScreen Learn mode (AC-6)", () => {
  it("lists all 9 units, opens next uncompleted with Enter, animates example, and applies adaptive fading", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Regex)" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/regex/aprender");

    const unit1 = REGEX_UNITS[0]!;
    const lesson = unit1.lessons[0]!;
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("nova");
    for (const unit of REGEX_UNITS) {
      expect(screen.getByTestId(`unit-status-${unit.id}`)).toBeTruthy();
    }

    // Enter opens first uncompleted lesson.
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByTestId("learn-explanation").textContent).toBe(lesson.explanation);
    expect(screen.getByTestId("learn-step").textContent).toContain("1");
    expect(screen.getByTestId("learn-reference").textContent).toContain(
      lesson.exercises[0].canonical,
    );

    // Animated example steps forward over time.
    const step0Pattern = screen.getByTestId("regex-example-pattern").textContent;
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByTestId("regex-example-pattern").textContent).not.toBe(step0Pattern);

    // Clean first-try answer on exercise 1 skips exercise 2 and jumps to exercise 3 (no hint).
    solveExercise(lesson.exercises[0]);
    expect(screen.getByTestId("learn-step").textContent).toContain("3");
    expect(screen.queryByTestId("learn-reference")).toBeNull();
    expect(screen.queryByTestId("learn-exercise-tokens")).toBeNull();

    // Finish exercise 3 -> lesson marked complete in popis.regex-learn.
    solveExercise(lesson.exercises[2]);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
    expect(loadRegexCompleted(store)).toContain(lesson.id);
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("em andamento");

    // Clicking Treinar switches to Prática.
    fireEvent.click(screen.getByRole("button", { name: "Treinar" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/regex/prática");
  });

  it("wrong attempt on exercise 1 moves to exercise 2 with token help", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Regex)" }));
    const lesson = REGEX_LESSONS[0]!;
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Expressão regular" });
    fireEvent.change(box, { target: { value: "zzzzzz-wrong" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("learn-feedback")).toBeTruthy();

    solveExercise(lesson.exercises[0]);
    expect(screen.getByTestId("learn-step").textContent).toContain("2");
    expect(screen.getByTestId("learn-exercise-tokens")).toBeTruthy();
  });
});
