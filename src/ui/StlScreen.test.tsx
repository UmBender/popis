// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateStlItem } from "../stl/drill";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { loadStlResults, loadStlSettings, STL_KEY } from "../storage/stl";
import { App } from "./App";
import { StlScreen } from "./StlScreen";

// T42 AC-5: STL output screen — 120 s round, Enter submits, wrong answer shows canonical
// output + one-line explanation, T19 components, stl.out events and Maratona folder.

const SEED = 31;
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
  const onRunning = vi.fn();
  const onBack = vi.fn();
  render(
    <StlScreen
      clock={clock}
      store={store}
      newSeed={() => SEED}
      onBack={onBack}
      onRunning={onRunning}
    />,
  );
  return { store, onRunning, onBack };
}

const input = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Saída do programa" });

function submit(val: string) {
  const box = input();
  fireEvent.change(box, { target: { value: val } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("StlScreen (AC-5)", () => {
  it("submitting the canonical output with Enter increments score and advances", () => {
    setup();

    const item0 = generateStlItem(SEED, 0, 1);
    expect(screen.getByTestId("stl-code").textContent).toContain(item0.lines[0]);
    expect(screen.getByTestId("stl-time").textContent).toBe("120 s");

    submit(`  ${item0.canonical}  `);

    expect(screen.getByTestId("stl-score").textContent).toBe("1");
    expect(screen.getByTestId("stl-feedback").getAttribute("data-outcome")).toBe("correct");

    const item1 = generateStlItem(SEED, 1, 1);
    expect(screen.getByTestId("stl-code").textContent).toContain(item1.lines[0]);
  });

  it("shows the expected output and one-line explanation when wrong", () => {
    const store = memoryStore({
      [STL_KEY]: JSON.stringify({ durationS: 120, level: 2 }),
    });
    setup(store);

    const item0 = generateStlItem(SEED, 0, 2);
    submit("resposta-errada");

    const feedback = screen.getByTestId("stl-feedback");
    expect(feedback.getAttribute("data-outcome")).toBe("wrong");
    expect(feedback.textContent).toContain(item0.canonical);
    expect(feedback.textContent).toContain(item0.explanation);
    expect(screen.getByTestId("stl-score").textContent).toBe("0");
  });

  it("ends the 120 s round on the fake clock and records stl.out events", () => {
    const store = memoryStore({
      [STL_KEY]: JSON.stringify({ durationS: 120, level: 3 }),
    });
    setup(store);

    const item0 = generateStlItem(SEED, 0, 3);
    submit(item0.canonical);
    submit("errado");

    advance(120_500);

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("stl-model-table")).toBeTruthy();
    expect(screen.getByTestId("stl-wrong-list").textContent).toContain("errado");
    expect(loadStlResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.drill === "stl.out")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
  });

  it("opens from the Maratona folder in App and supports level, duration, shortcuts and results keys", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "STL" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/maratona/stl");
    expect(screen.getByRole("heading", { level: 1, name: "STL" })).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Nível" }), { target: { value: "4" } });
    expect(loadStlSettings(store).level).toBe(4);

    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    expect(loadStlSettings(store).durationS).toBe(30);

    // Empty Enter and plain keys do not submit.
    fireEvent.keyDown(input(), { key: "a" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.queryByTestId("stl-feedback")).toBeNull();

    // Typing starts the round and hides the tree.
    fireEvent.change(input(), { target: { value: "0" } });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    // Ctrl+Enter skips.
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("stl-feedback").getAttribute("data-outcome")).toBe("skipped");

    // Ctrl+Shift+Enter restarts.
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(screen.queryByTestId("stl-feedback")).toBeNull();

    // Start again, hit warning tone at <= 10 s, submit via form button, finish at 30 s.
    const item0 = generateStlItem(SEED, 0, 4);
    fireEvent.change(input(), { target: { value: item0.canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByTestId("stl-score").textContent).toBe("1");

    advance(25_000);
    expect(screen.getByTestId("stl-time").className).toContain("warning");
    advance(6_000);
    expect(screen.getByTestId("stl-final-score").textContent).toBe("1 acerto em 30 s");

    // Enter on results starts a new round; Esc on results returns to idle.
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "1" } });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("result")).toBeNull();

    // Esc while running exits the round and brings the tree back.
    fireEvent.change(input(), { target: { value: "1" } });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });
});
