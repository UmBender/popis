// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateCommandItem } from "../gdb/cmd-drill";
import { loadEvents } from "../storage/events";
import { GDB_KEY, loadGdbResults, loadGdbSettings } from "../storage/gdb";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { App } from "./App";
import { GdbScreen } from "./GdbScreen";

// T25 AC-5: GDB Comandos screen: code with line numbers/arrow/breakpoints/session,
// alias acceptance, wrong feedback with canonical command, 60 s timer, results and T22 events.

const SEED = 23;
let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
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

function setup(store: KeyValueStore = memoryStore()) {
  const onLearn = vi.fn();
  const onRunning = vi.fn();
  render(
    <GdbScreen
      drill="commands"
      clock={clock}
      store={store}
      newSeed={() => SEED}
      onBack={vi.fn()}
      onRunning={onRunning}
      onLearn={onLearn}
    />,
  );
  return { store, onLearn, onRunning };
}

const input = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Comando gdb" });

function submit(cmd: string) {
  const box = input();
  fireEvent.change(box, { target: { value: cmd } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("GdbScreen Commands mode (AC-5)", () => {
  it("Enter submits and an accepted alias counts as correct", () => {
    const store = memoryStore({
      [GDB_KEY]: JSON.stringify({ durationS: 60, kinds: ["break-linha"] }),
    });
    setup(store);

    const item0 = generateCommandItem(SEED, 0, ["break-linha"]);
    expect(screen.getByTestId("gdb-prompt").textContent).toBe(item0.prompt);
    expect(screen.getByTestId("gdb-code").textContent).toContain(item0.lines[0] ?? "");
    expect(screen.getByTestId("gdb-session")).toBeTruthy();

    // Submit an accepted alias instead of the canonical form.
    const alias = item0.alternatives[0] ?? item0.canonical;
    submit(alias);

    expect(screen.getByTestId("gdb-score").textContent).toBe("1");
    expect(screen.getByTestId("gdb-feedback").getAttribute("data-outcome")).toBe("correct");

    // Advances to item 1.
    const item1 = generateCommandItem(SEED, 1, ["break-linha"]);
    expect(screen.getByTestId("gdb-prompt").textContent).toBe(item1.prompt);
  });

  it("a wrong command shows the canonical form and moves on", () => {
    const store = memoryStore({
      [GDB_KEY]: JSON.stringify({ durationS: 60, kinds: ["break-linha"] }),
    });
    setup(store);

    const item0 = generateCommandItem(SEED, 0, ["break-linha"]);
    const item1 = generateCommandItem(SEED, 1, ["break-linha"]);

    submit("step");

    const feedback = screen.getByTestId("gdb-feedback");
    expect(feedback.getAttribute("data-outcome")).toBe("wrong");
    expect(feedback.textContent).toContain(item0.canonical);
    expect(screen.getByTestId("gdb-score").textContent).toBe("0");
    // Immediately moved on to item 1.
    expect(screen.getByTestId("gdb-prompt").textContent).toBe(item1.prompt);
  });

  it("the round ends at 60 s on the fake clock", () => {
    const store = memoryStore({
      [GDB_KEY]: JSON.stringify({ durationS: 60, kinds: ["break-linha", "andar"] }),
    });
    setup(store);

    const item0 = generateCommandItem(SEED, 0, ["break-linha", "andar"]);
    submit(item0.canonical);
    submit("zzz");

    expect(screen.getByTestId("gdb-time").textContent).toBe("60 s");
    advance(60_500);

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("gdb-kind-table")).toBeTruthy();
    expect(screen.getByTestId("gdb-wrong-list").textContent).toContain("zzz");
    expect(loadGdbResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.drill === "gdb.cmd")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
  });

  it("supports kind toggles, skip, restart, Esc exit and opens from the app tree", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "Comandos" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/comandos");
    expect(screen.getByRole("heading", { level: 1, name: "Comandos" })).toBeTruthy();

    // Open kind selector and uncheck one kind; setting persists to popis.gdb.
    const kindsSummary = screen.getByText("Tipos de comando");
    fireEvent.click(kindsSummary);
    const iniciarCheckbox = screen.getByRole<HTMLInputElement>("checkbox", { name: /Iniciar/ });
    fireEvent.click(iniciarCheckbox);
    expect(loadGdbSettings(store).kinds).not.toContain("iniciar");

    // Start round by typing, skip with Ctrl+Enter, exit with Esc.
    const box = input();
    fireEvent.change(box, { target: { value: "b" } });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("gdb-feedback").getAttribute("data-outcome")).toBe("skipped");

    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });

  it("aprender link in the Comandos reference panel jumps to the command lesson", () => {
    const { onLearn } = setup();
    const ref = screen.getByRole("group", { name: "Comandos" });
    const links = within(ref).getAllByRole("button", { name: "aprender" });
    expect(links.length).toBeGreaterThanOrEqual(30);
    fireEvent.click(links[0]!);
    expect(onLearn).toHaveBeenCalledTimes(1);
    expect(typeof onLearn.mock.calls[0]?.[0]).toBe("string");
  });

  it("handles duration change, form submit button, restart shortcut, warning tone and results keyboard", () => {
    const store = memoryStore({
      [GDB_KEY]: JSON.stringify({ durationS: 60, kinds: ["gerir"] }),
    });
    setup(store);

    // Change duration to 30 s.
    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    expect(loadGdbSettings(store).durationS).toBe(30);

    // Empty Enter and non-Enter keys do nothing.
    fireEvent.keyDown(input(), { key: "a" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.queryByTestId("gdb-feedback")).toBeNull();

    // Submit via the Enviar button (form submit) with a valid command -> 1 acerto (singular).
    const item0 = generateCommandItem(SEED, 0, ["gerir"]);
    fireEvent.change(input(), { target: { value: item0.canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByTestId("gdb-score").textContent).toBe("1");

    // Advance into <= 10 s warning zone, then expire at 30 s.
    advance(25_000);
    expect(screen.getByTestId("gdb-time").className).toContain("warning");
    advance(6_000);
    expect(screen.getByTestId("gdb-final-score").textContent).toBe("1 acerto em 30 s");

    // Clicking Jogar de novo starts a fresh round.
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.queryByTestId("result")).toBeNull();

    // Ctrl+Shift+Enter restarts mid-round; Enter and Escape on results work.
    fireEvent.change(input(), { target: { value: "zzz" } });
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(input().value).toBe("");

    fireEvent.change(input(), { target: { value: "zzz" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "zzz" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("result")).toBeNull();
  });
});
