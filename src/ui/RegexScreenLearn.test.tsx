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

  it("Enter on a focused lesson button is left to the button and does not open the next lesson", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Regex)" }));
    const second = REGEX_UNITS[1]!.lessons[0]!;
    const button = screen.getByRole("button", { name: second.title });

    fireEvent.keyDown(button, { key: "Enter" });

    expect(screen.queryByTestId("learn-explanation")).toBeNull();
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

  it("supports example Play/Pause/Restart, exercise restart, extrair/trocar/ler lessons and unit completion", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Regex)" }));

    // Complete both lessons of Unit 1 so unit status becomes "concluída".
    const unit1 = REGEX_UNITS[0]!;
    for (const lesson of unit1.lessons) {
      fireEvent.click(screen.getByRole("button", { name: lesson.title }));
      // Pause, resume, advance to end, then click Tocar and Recomeçar.
      fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
      fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
      fireEvent.click(screen.getByRole("button", { name: "Recomeçar" }));

      // Empty submit is ignored; non-Enter key is ignored; syntax error shows alert without crashing.
      const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Expressão regular" });
      fireEvent.keyDown(box, { key: "a" });
      fireEvent.keyDown(box, { key: "Enter" });
      fireEvent.change(box, { target: { value: "(unclosed" } });
      act(() => {
        vi.advanceTimersByTime(20);
      });
      expect(screen.getByTestId("regex-error")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Recomeçar exercício" }));

      solveExercise(lesson.exercises[0]);
      solveExercise(lesson.exercises[2]);
      expect(screen.getByTestId("learn-done")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Lições" }));
    }
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("concluída");

    // Reopening a completed lesson shows "learn-was-done".
    fireEvent.click(screen.getByRole("button", { name: `${unit1.lessons[0]!.title} — feito` }));
    expect(screen.getByTestId("learn-was-done")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lições" }));

    // Exercise an extrair lesson (Unit 5 Capture), a trocar lesson (Unit 6 re.sub), and a ler exercise (Unit 4 Word boundary).
    const capLesson = REGEX_LESSONS.find((l) => l.id === "u5-capture")!;
    fireEvent.click(screen.getByRole("button", { name: capLesson.title }));
    solveExercise(capLesson.exercises[0]);
    solveExercise(capLesson.exercises[2]);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    const subLesson = REGEX_LESSONS.find((l) => l.id === "u6-re-sub")!;
    fireEvent.click(screen.getByRole("button", { name: subLesson.title }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Also exercise form submit button click on trocar.
    const boxSub = screen.getByRole<HTMLInputElement>("textbox", { name: "Expressão regular" });
    const replSub = screen.getByRole<HTMLInputElement>("textbox", { name: "Substituição" });
    fireEvent.change(boxSub, { target: { value: subLesson.exercises[0].canonical } });
    fireEvent.change(replSub, {
      target: {
        value:
          subLesson.exercises[0].kind === "trocar"
            ? subLesson.exercises[0].canonicalReplacement
            : "",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    solveExercise(subLesson.exercises[2]);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    const wbLesson = REGEX_LESSONS.find((l) => l.id === "u4-word-boundary")!;
    fireEvent.click(screen.getByRole("button", { name: wbLesson.title }));
    solveExercise(wbLesson.exercises[0]);
    // Exercise 3 of u4-word-boundary is a `ler` exercise! Submit wrong first, then right.
    fireEvent.click(screen.getByRole("button", { name: "Conferir" }));
    expect(screen.getByTestId("learn-feedback")).toBeTruthy();
    solveExercise(wbLesson.exercises[2]);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    // Press Enter on a button control (ignored by global shortcut) and on body after opening.
    const voltar = screen.getByRole("button", { name: "Voltar" });
    fireEvent.keyDown(voltar, { key: "Enter" });
    fireEvent.click(voltar);
  });
});
