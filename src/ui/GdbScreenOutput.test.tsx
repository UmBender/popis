// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateOutputItem } from "../gdb/out-drill";
import { loadEvents } from "../storage/events";
import { GDB_OUT_KEY, loadGdbOutResults, loadGdbOutSettings } from "../storage/gdb";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { App } from "./App";
import { GdbScreen } from "./GdbScreen";

// T26 AC-7: GDB Saída screen — code, breakpoint, locals, accepted gdb output,
// wrong output shows real output + reason, 60 s timer on fake clock, results and gdb.out events.

const SEED = 29;
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
      drill="output"
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

const input = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Saída do gdb" });

function submit(val: string) {
  const box = input();
  fireEvent.change(box, { target: { value: val } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("GdbScreen Output mode (AC-7)", () => {
  it("typing the gdb value counts as correct", () => {
    const store = memoryStore({
      [GDB_OUT_KEY]: JSON.stringify({ durationS: 60, level: 1, kinds: ["formato"] }),
    });
    setup(store);

    const item0 = generateOutputItem(SEED, 0, 1, ["formato"]);
    expect(screen.getByTestId("gdb-out-command").textContent).toContain(item0.command);
    expect(screen.getByTestId("gdb-out-code").textContent).toContain("int main()");

    // Optional $1 = prefix is accepted.
    submit(`$1 = ${item0.canonical}`);

    expect(screen.getByTestId("gdb-out-score").textContent).toBe("1");
    expect(screen.getByTestId("gdb-out-feedback").getAttribute("data-outcome")).toBe("correct");

    const item1 = generateOutputItem(SEED, 1, 1, ["formato"]);
    expect(screen.getByTestId("gdb-out-command").textContent).toContain(item1.command);
  });

  it("a wrong value shows the real output and the reason", () => {
    const store = memoryStore({
      [GDB_OUT_KEY]: JSON.stringify({ durationS: 60, level: 1, kinds: ["memoria"] }),
    });
    setup(store);

    const item0 = generateOutputItem(SEED, 0, 1, ["memoria"]);
    const item1 = generateOutputItem(SEED, 1, 1, ["memoria"]);

    submit("0xdeadbeef");

    const feedback = screen.getByTestId("gdb-out-feedback");
    expect(feedback.getAttribute("data-outcome")).toBe("wrong");
    expect(feedback.textContent).toContain(item0.canonical);
    expect(feedback.textContent).toContain(item0.reason);
    expect(screen.getByTestId("gdb-out-score").textContent).toBe("0");
    expect(screen.getByTestId("gdb-out-command").textContent).toContain(item1.command);
  });

  it("the round ends at 60 s on the fake clock", () => {
    const store = memoryStore({
      [GDB_OUT_KEY]: JSON.stringify({ durationS: 60, level: 2, kinds: ["formato", "sizeof"] }),
    });
    setup(store);

    const item0 = generateOutputItem(SEED, 0, 2, ["formato", "sizeof"]);
    submit(item0.canonical);
    submit("errado");

    expect(screen.getByTestId("gdb-out-time").textContent).toBe("60 s");
    advance(60_500);

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("gdb-out-kind-table")).toBeTruthy();
    expect(screen.getByTestId("gdb-out-wrong-list").textContent).toContain("errado");
    expect(loadGdbOutResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.drill === "gdb.out")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
  });

  it("supports level and kind toggles, skip, restart, Esc exit, locals and opens from the app tree", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "Saída" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/gdb/saida");
    expect(screen.getByRole("heading", { level: 1, name: "Saída" })).toBeTruthy();

    // Change level to 2 and persist in popis.gdb-output.
    fireEvent.change(screen.getByRole("combobox", { name: "Nível" }), {
      target: { value: "2" },
    });
    expect(loadGdbOutSettings(store).level).toBe(2);

    // Open kind selector and uncheck formato.
    fireEvent.click(screen.getByText("Tipos de saída"));
    const fmtCheckbox = screen.getByRole<HTMLInputElement>("checkbox", { name: /Formatos/ });
    fireEvent.click(fmtCheckbox);
    expect(loadGdbOutSettings(store).kinds).not.toContain("formato");

    // Start round by typing, skip with Ctrl+Enter, exit with Esc.
    const box = input();
    fireEvent.change(box, { target: { value: "0" } });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("gdb-out-feedback").getAttribute("data-outcome")).toBe("skipped");

    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });

  it("aprender link in the Formatos reference panel jumps to the output lesson", () => {
    const { onLearn } = setup();
    const ref = screen.getByRole("group", { name: "Formatos" });
    const links = within(ref).getAllByRole("button", { name: "aprender" });
    expect(links.length).toBeGreaterThanOrEqual(5);
    fireEvent.click(links[0]!);
    expect(onLearn).toHaveBeenCalledTimes(1);
    expect(typeof onLearn.mock.calls[0]?.[0]).toBe("string");
  });

  it("handles duration change, form submit, restart shortcut, warning tone and results keyboard", () => {
    const store = memoryStore({
      [GDB_OUT_KEY]: JSON.stringify({ durationS: 60, level: 1, kinds: ["ponteiro"] }),
    });
    setup(store);

    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    expect(loadGdbOutSettings(store).durationS).toBe(30);

    // Empty Enter and non-Enter keys do nothing.
    fireEvent.keyDown(input(), { key: "a" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.queryByTestId("gdb-out-feedback")).toBeNull();

    const item0 = generateOutputItem(SEED, 0, 1, ["ponteiro"]);
    fireEvent.change(input(), { target: { value: item0.canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByTestId("gdb-out-score").textContent).toBe("1");

    advance(25_000);
    expect(screen.getByTestId("gdb-out-time").className).toContain("warning");
    advance(6_000);
    expect(screen.getByTestId("gdb-out-final-score").textContent).toBe("1 acerto em 30 s");

    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "0" } });
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(input().value).toBe("");

    fireEvent.change(input(), { target: { value: "0" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "0" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("result")).toBeNull();
  });
});
