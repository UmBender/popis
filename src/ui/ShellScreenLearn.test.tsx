// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { SHELL_LESSONS, SHELL_UNITS, shellLessonForCommand } from "../shell/curriculum";
import { memoryStore } from "../storage/history";
import { loadShellSettings } from "../storage/shell";
import { loadShellCompleted } from "../storage/shell-learn";
import { App } from "./App";

// T39 AC-6: Shell Aprender curriculum UI — adaptive fading, animated oracle terminal,
// unit status, Treinar jump to Comandos, and aprender links.

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function submitCmd(cmd: string) {
  const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Comando bash" });
  fireEvent.change(box, { target: { value: cmd } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("ShellScreen Learn mode (AC-6)", () => {
  it("adaptive fading skips step 2 on a first-try answer and persists progress", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Shell)" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/shell/aprender");

    const unit1 = SHELL_UNITS[0]!;
    const lesson = unit1.lessons[0]!;
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("nova");

    // Enter on list opens next uncompleted lesson.
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByTestId("learn-explanation").textContent).toBe(lesson.explanation);
    expect(screen.getByTestId("learn-step").textContent).toContain("1");
    expect(screen.getByTestId("learn-reference").textContent).toContain(
      lesson.exercises[0].canonical,
    );

    // Animated terminal example advances over time.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("shell-example-terminal").textContent?.length).toBeGreaterThan(0);

    // Clean first-try on exercise 1 skips exercise 2 -> exercise 3.
    submitCmd(lesson.exercises[0].canonical);
    expect(screen.getByTestId("learn-step").textContent).toContain("3");
    expect(screen.queryByTestId("learn-reference")).toBeNull();
    expect(screen.queryByTestId("learn-exercise-commands")).toBeNull();

    // Wrong answer shows feedback and allows retry.
    submitCmd("case $x in a) echo a;; esac");
    expect(screen.getByTestId("learn-feedback").textContent).toContain("case");

    // Complete exercise 3 -> persists progress to popis.shell-learn.
    submitCmd(lesson.exercises[2].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
    expect(loadShellCompleted(store)).toContain(lesson.id);
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("em andamento");
  });

  it("a wrong attempt on exercise 1 moves to exercise 2 with commands help", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Shell)" }));
    const lesson = SHELL_LESSONS[0]!;
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    submitCmd("echo errado");
    submitCmd(lesson.exercises[0].canonical);
    expect(screen.getByTestId("learn-step").textContent).toContain("2");
    expect(screen.getByTestId("learn-exercise-commands")).toBeTruthy();

    submitCmd(lesson.exercises[1].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
  });

  it("Treinar opens Comandos with the lesson kinds selected", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (Shell)" }));
    const lesson = shellLessonForCommand("diff")!;
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    submitCmd(lesson.exercises[0].canonical);
    submitCmd(lesson.exercises[2].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Treinar" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/shell/comandos");
    expect(loadShellSettings(store).kinds).toEqual(lesson.practiceKinds);
  });

  it("aprender link in Comandos opens the command lesson and supports pause/replay/reset/already-done", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 17} />);

    fireEvent.click(screen.getByRole("radio", { name: "Comandos (Shell)" }));
    const ref = screen.getByRole<HTMLDetailsElement>("group", { name: "Comandos" });
    ref.open = true;
    const targetLesson = shellLessonForCommand("ulimit")!;
    const item = Array.from(ref.querySelectorAll("li")).find(
      (li) => li.querySelector("code")?.textContent?.trim() === "ulimit",
    );
    expect(item).toBeTruthy();
    fireEvent.click(item!.querySelector("button")!);

    expect(screen.getByTestId("shell-path").textContent).toBe("popis/shell/aprender");
    expect(screen.getByRole("heading", { level: 2, name: targetLesson.title })).toBeTruthy();

    // Pause, resume, let finish, replay, restart example.
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar" }));

    // Empty submit and non-Enter ignored; reset clears feedback.
    const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Comando bash" });
    fireEvent.keyDown(box, { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.queryByTestId("learn-feedback")).toBeNull();

    submitCmd("echo errado");
    expect(screen.getByTestId("learn-feedback")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar exercício" }));
    expect(screen.queryByTestId("learn-feedback")).toBeNull();

    // Finish via Enviar button, go back to list, check Enter on button ignored, reopen -> learn-was-done.
    fireEvent.change(box, { target: { value: targetLesson.exercises[0].canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    submitCmd(targetLesson.exercises[2].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Lições" }));
    expect(screen.queryByTestId("learn-explanation")).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: "Voltar" }), { key: "Enter" });
    expect(screen.queryByTestId("learn-explanation")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: `${targetLesson.title} — feito` }));
    expect(screen.getByTestId("learn-was-done")).toBeTruthy();

    // Unit 9 lesson (lesson-only) completes cleanly without a Treinar button.
    fireEvent.click(screen.getByRole("button", { name: "Lições" }));
    const u9Lesson = SHELL_UNITS[8]!.lessons[0]!;
    fireEvent.click(screen.getByRole("button", { name: u9Lesson.title }));
    submitCmd(u9Lesson.exercises[0].canonical);
    submitCmd(u9Lesson.exercises[2].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Treinar" })).toBeNull();
  });
});
