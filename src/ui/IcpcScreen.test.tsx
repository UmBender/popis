// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateIcpcItem } from "../icpc/drill";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { ICPC_KEY, loadIcpcResults, loadIcpcSettings } from "../storage/icpc";
import { App } from "./App";
import { IcpcScreen } from "./IcpcScreen";

// T43 AC-3: ICPC scoreboard screen — BOCA/DOMjudge board with token balloons,
// numeric or problem-letter answers, 90 s round, icpc.score events and Maratona folder.

const SEED = 43;
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
    <IcpcScreen
      clock={clock}
      store={store}
      newSeed={() => SEED}
      onBack={onBack}
      onRunning={onRunning}
    />,
  );
  return { store, onRunning, onBack };
}

const input = () => screen.getByRole<HTMLInputElement>("textbox", { name: "Resposta" });

function submit(val: string) {
  const box = input();
  fireEvent.change(box, { target: { value: val } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("IcpcScreen (AC-3)", () => {
  it("renders a 90 s round with BOCA/DOMjudge board and balloons, and accepts numeric and letter answers", () => {
    const store = memoryStore({
      [ICPC_KEY]: JSON.stringify({ durationS: 90, kind: "penalidade", compileErrorCounts: false }),
    });
    setup(store);

    const item0 = generateIcpcItem(SEED, 0, { kind: "penalidade", compileErrorCounts: false });
    expect(screen.getByTestId("icpc-time").textContent).toBe("90 s");
    expect(screen.getByTestId("icpc-board")).toBeTruthy();
    expect(screen.getByTestId("icpc-board").querySelectorAll(".icpc-balloon").length).toBeGreaterThan(
      0,
    );
    expect(input().inputMode).toBe("numeric");

    submit(` ${item0.canonical} `);
    expect(screen.getByTestId("icpc-score").textContent).toBe("1");
    expect(screen.getByTestId("icpc-feedback").getAttribute("data-outcome")).toBe("correct");

    // Switch to "escolher" (letter answer, case-insensitive).
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo" }), {
      target: { value: "escolher" },
    });
    expect(loadIcpcSettings(store).kind).toBe("escolher");
    expect(input().inputMode).toBe("text");
    const chooseItem = generateIcpcItem(SEED, 0, { kind: "escolher", compileErrorCounts: false });
    submit(chooseItem.canonical.toLowerCase());
    expect(screen.getByTestId("icpc-score").textContent).toBe("1");
    expect(screen.getByTestId("icpc-feedback").getAttribute("data-outcome")).toBe("correct");
  });

  it("renders posicao and ultrapassar scoreboards and explains wrong answers", () => {
    const storePos = memoryStore({
      [ICPC_KEY]: JSON.stringify({ durationS: 90, kind: "posicao", compileErrorCounts: false }),
    });
    const { unmount } = render(
      <IcpcScreen
        clock={clock}
        store={storePos}
        newSeed={() => SEED}
        onBack={vi.fn()}
        onRunning={vi.fn()}
      />,
    );
    const posItem = generateIcpcItem(SEED, 0, { kind: "posicao", compileErrorCounts: false });
    expect(screen.getByTestId("icpc-new-submission")).toBeTruthy();
    submit("99");
    const fb = screen.getByTestId("icpc-feedback");
    expect(fb.getAttribute("data-outcome")).toBe("wrong");
    expect(fb.textContent).toContain(posItem.canonical);
    expect(fb.textContent).toContain(posItem.explanation);
    unmount();

    const storePass = memoryStore({
      [ICPC_KEY]: JSON.stringify({ durationS: 90, kind: "ultrapassar", compileErrorCounts: false }),
    });
    render(
      <IcpcScreen
        clock={clock}
        store={storePass}
        newSeed={() => SEED}
        onBack={vi.fn()}
        onRunning={vi.fn()}
      />,
    );
    const passItem = generateIcpcItem(SEED, 0, { kind: "ultrapassar", compileErrorCounts: false });
    expect(screen.getByTestId("icpc-board")).toBeTruthy();
    submit(passItem.canonical);
    expect(screen.getByTestId("icpc-feedback").getAttribute("data-outcome")).toBe("correct");
  });

  it("ends the 90 s round on the fake clock and records icpc.score events", () => {
    const store = memoryStore();
    setup(store);

    const item0 = generateIcpcItem(SEED, 0, { kind: "all", compileErrorCounts: false });
    submit(item0.canonical);
    submit("errado");

    advance(90_500);

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("icpc-kind-table")).toBeTruthy();
    expect(screen.getByTestId("icpc-wrong-list").textContent).toContain("errado");
    expect(loadIcpcResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.drill === "icpc.score")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
  });

  it("opens from Maratona in App and supports options, CE toggle, shortcuts and results keys", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "Placar" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/maratona/placar");
    expect(screen.getByRole("heading", { level: 1, name: "Placar" })).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "60" },
    });
    expect(loadIcpcSettings(store).durationS).toBe(60);

    fireEvent.click(screen.getByRole("checkbox", { name: /CE conta penalidade/i }));
    expect(loadIcpcSettings(store).compileErrorCounts).toBe(true);

    // Empty Enter and plain keys do not submit.
    fireEvent.keyDown(input(), { key: "a" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.queryByTestId("icpc-feedback")).toBeNull();

    // Typing starts the round and hides the tree.
    fireEvent.change(input(), { target: { value: "1" } });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    // Ctrl+Enter skips.
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("icpc-feedback").getAttribute("data-outcome")).toBe("skipped");

    // Ctrl+Shift+Enter restarts.
    fireEvent.keyDown(input(), { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(screen.queryByTestId("icpc-feedback")).toBeNull();

    // Submit via form button, hit warning tone at <= 10 s, finish at 60 s.
    const item0 = generateIcpcItem(SEED, 0, { kind: "all", compileErrorCounts: true });
    fireEvent.change(input(), { target: { value: item0.canonical } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByTestId("icpc-score").textContent).toBe("1");

    advance(52_000);
    expect(screen.getByTestId("icpc-time").className).toContain("warning");
    advance(9_000);
    expect(screen.getByTestId("icpc-final-score").textContent).toBe("1 acerto em 60 s");

    // "Jogar de novo" button starts a new round.
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.queryByTestId("result")).toBeNull();

    // Enter and Escape on results.
    fireEvent.change(input(), { target: { value: "1" } });
    advance(61_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("result")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.change(input(), { target: { value: "1" } });
    advance(61_000);
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
