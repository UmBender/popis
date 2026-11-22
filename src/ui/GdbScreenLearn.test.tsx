// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { GDB_LESSONS, GDB_UNITS, gdbLessonById, gdbLessonForCommand } from "../gdb/curriculum";
import { loadGdbOutSettings, loadGdbSettings } from "../storage/gdb";
import { loadGdbCompleted } from "../storage/gdb-learn";
import { memoryStore } from "../storage/history";
import { App } from "./App";

// T25 AC-6: GDB Aprender curriculum UI: adaptive fading, Treinar button,
// aprender links, unit status, Enter shortcut, and animated real-gdb example.

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function submitCmd(cmd: string) {
  const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Comando gdb" });
  fireEvent.change(box, { target: { value: cmd } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("GdbScreen Learn mode (AC-6)", () => {
  it("adaptive fading skips step 2 on a first-try answer", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 11} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (GDB)" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/aprender");

    const unit1 = GDB_UNITS[0]!;
    const lesson = unit1.lessons[0]!;
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("nova");

    // Enter on the list opens the first uncompleted lesson.
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByTestId("learn-explanation").textContent).toBe(lesson.explanation);
    expect(screen.getByTestId("learn-step").textContent).toContain("1");
    expect(screen.getByTestId("learn-reference").textContent).toContain(
      lesson.exercises[0].canonical,
    );

    // Animated example advances frames over time.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("gdb-example-session").textContent?.length).toBeGreaterThan(0);

    // Answer exercise 1 cleanly on first try -> skips exercise 2 -> jumps to exercise 3.
    submitCmd(lesson.exercises[0].canonical);
    expect(screen.getByTestId("learn-step").textContent).toContain("3");
    expect(screen.queryByTestId("learn-reference")).toBeNull();
    expect(screen.queryByTestId("learn-exercise-commands")).toBeNull();

    // Wrong answer on exercise 3 shows feedback and lets user retry.
    submitCmd("zzz");
    expect(screen.getByTestId("learn-feedback")).toBeTruthy();

    // Correct answer finishes lesson and persists progress.
    submitCmd(lesson.exercises[2].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
    expect(loadGdbCompleted(store)).toContain(lesson.id);
    expect(screen.getByTestId(`unit-status-${unit1.id}`).textContent).toBe("em andamento");
  });

  it("a wrong attempt on exercise 1 moves to exercise 2 with commands help", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 11} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (GDB)" }));
    const lesson = GDB_LESSONS[0]!;
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    // Miss once on step 1, then succeed -> goes to step 2 (not step 3).
    submitCmd("zzz");
    submitCmd(lesson.exercises[0].canonical);
    expect(screen.getByTestId("learn-step").textContent).toContain("2");
    expect(screen.getByTestId("learn-exercise-commands")).toBeTruthy();

    // Succeed on first try on step 2 -> skips step 3 and completes the lesson.
    submitCmd(lesson.exercises[1].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();
  });

  it("Treinar opens Comandos with the lesson kinds selected", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 11} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (GDB)" }));
    const lesson = gdbLessonForCommand("tbreak")!;
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    submitCmd(lesson.exercises[0].canonical);
    submitCmd(lesson.exercises[2].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Treinar" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/comandos");
    expect(loadGdbSettings(store).kinds).toEqual(lesson.practiceKinds);
  });

  it("aprender link opens the command lesson", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 11} />);

    fireEvent.click(screen.getByRole("radio", { name: "Comandos" }));
    const ref = screen.getByRole<HTMLDetailsElement>("group", { name: "Comandos" });
    ref.open = true;
    const targetLesson = gdbLessonForCommand("watch")!;
    const watchItem = Array.from(ref.querySelectorAll("li")).find(
      (li) => li.querySelector("code")?.textContent?.trim() === "watch",
    );
    expect(watchItem).toBeTruthy();
    const learnBtn = watchItem!.querySelector("button");
    expect(learnBtn?.textContent).toBe("aprender");
    fireEvent.click(learnBtn!);

    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/aprender");
    expect(screen.getByRole("heading", { level: 2, name: targetLesson.title })).toBeTruthy();
  });

  it("supports example pause/replay, exercise reset, disabled breakpoints, Lições button and already-done state", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 11} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (GDB)" }));

    // Open u2-manage-bp (exercise 2 has a disabled breakpoint `○`).
    const lesson = gdbLessonForCommand("delete")!;
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    // Pause, resume, let example reach end, replay from end, and restart example.
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar" }));

    // Empty submit and non-Enter key do nothing; wrong submit then reset clears feedback.
    const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Comando gdb" });
    fireEvent.keyDown(box, { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.queryByTestId("learn-feedback")).toBeNull();

    submitCmd("zzz");
    expect(screen.getByTestId("learn-feedback")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar exercício" }));
    expect(screen.queryByTestId("learn-feedback")).toBeNull();

    // Miss once on step 1 then solve via Enviar button -> step 2 (shows disabled bp `○`).
    submitCmd("zzz");
    fireEvent.change(box, { target: { value: lesson.exercises[0].canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByTestId("learn-step").textContent).toContain("2");
    expect(document.body.textContent).toContain("○");

    // Finish step 2 cleanly -> completes lesson.
    submitCmd(lesson.exercises[1].canonical);
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    // Return to list via Lições button, then reopen completed lesson to see learn-was-done.
    fireEvent.click(screen.getByRole("button", { name: "Lições" }));
    expect(screen.queryByTestId("learn-explanation")).toBeNull();
    // Enter on a button control is ignored by the list-level Enter shortcut.
    const volver = screen.getByRole("button", { name: "Voltar" });
    fireEvent.keyDown(volver, { key: "Enter" });
    expect(screen.queryByTestId("learn-explanation")).toBeNull();
    // Open u1-run (which has exact command keys matching COMMAND_TABLE descriptions).
    const runLesson = gdbLessonForCommand("run")!;
    fireEvent.click(screen.getByRole("button", { name: runLesson.title }));
    expect(screen.getByTestId("learn-commands").textContent).toContain("—");
    fireEvent.click(screen.getByRole("button", { name: "Lições" }));
    fireEvent.click(screen.getByRole("button", { name: `${lesson.title} — feito` }));
    expect(screen.getByTestId("learn-was-done")).toBeTruthy();
  });

  it("Treinar opens Saída with the lesson kinds selected", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => 11} />);

    fireEvent.click(screen.getByRole("radio", { name: "Aprender (GDB)" }));
    const lesson = gdbLessonById("u10-formats")!;
    expect(lesson).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: lesson.title }));

    // Output lesson asks for gdb output (not a command) and follows adaptive fading.
    const box = screen.getByRole<HTMLInputElement>("textbox", { name: "Saída do gdb" });
    expect(screen.getByTestId("learn-reference").textContent).toContain(
      lesson.exercises[0].canonical,
    );

    // Wrong answer shows reason; correct on step 1 -> step 2 -> complete.
    fireEvent.change(box, { target: { value: "errado" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("learn-feedback")).toBeTruthy();

    fireEvent.change(box, { target: { value: lesson.exercises[0].canonical } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("learn-step").textContent).toContain("2");

    fireEvent.change(box, { target: { value: lesson.exercises[1].canonical } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("learn-done")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Treinar" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/saída");
    expect(loadGdbOutSettings(store).kinds).toEqual(lesson.practiceOutputKinds);

    // Open an examine output lesson (u14-endian) to verify non-print `>` prompt prefix.
    fireEvent.click(screen.getByRole("radio", { name: "Aprender (GDB)" }));
    const endianLesson = gdbLessonById("u14-endian")!;
    fireEvent.click(screen.getByRole("button", { name: endianLesson.title }));
    expect(document.querySelector(".gdb-prompt-prefix")?.textContent).toBe(">");
  });
});
