// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateCompileItem } from "../compile/drill";
import { manualClock, type ManualClock } from "../core/clock";
import { COMPILE_KEY, loadCompileResults, loadCompileSettings } from "../storage/compile";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { App } from "./App";
import { CompileScreen } from "./CompileScreen";

// T40 AC-4: Ler o erro screen — numbered lines, click and keyboard (arrows+Enter and 1-4),
// wrong-answer highlight and explanation, 90 s timer, per-group results, popis.compile, compile.read events.

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
  let seed = SEED;
  const newSeed = vi.fn(() => {
    const s = seed;
    seed += 1;
    return s;
  });
  render(
    <CompileScreen
      clock={clock}
      store={store}
      newSeed={newSeed}
      onBack={onBack}
      onRunning={onRunning}
    />,
  );
  return { store, onRunning, onBack, newSeed };
}

describe("CompileScreen (AC-4)", () => {
  it("correct line and cause count a hit via clicks and via keyboard arrows + Enter + 1-4", () => {
    const store = memoryStore({
      [COMPILE_KEY]: JSON.stringify({ durationS: 90, groups: ["compilacao", "ubsan"] }),
    });
    setup(store);

    const item0 = generateCompileItem(SEED, 0, ["compilacao", "ubsan"]);
    expect(screen.getByTestId("compile-output").textContent).toBe(item0.caseData.output);
    expect(screen.getByTestId("compile-time").textContent).toBe("90 s");

    // First item answered by two clicks: line then cause.
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(item0.caseData.line)}` }));
    const choices = screen.getByTestId("compile-choices");
    fireEvent.click(
      within(choices).getByRole("button", {
        name: new RegExp(item0.choices[item0.correctChoiceIndex - 1]!.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      }),
    );

    expect(screen.getByTestId("compile-score").textContent).toBe("1");
    expect(screen.getByTestId("compile-feedback").getAttribute("data-outcome")).toBe("correct");

    // Second item answered via keyboard: ArrowDown to reach target line, Enter, then shortcut 1-4.
    const item1 = generateCompileItem(SEED, 1, ["compilacao", "ubsan"]);
    expect(screen.getByTestId("compile-output").textContent).toBe(item1.caseData.output);

    const codeArea = screen.getByTestId("compile-code");
    for (let i = 1; i < item1.caseData.line; i++) {
      fireEvent.keyDown(codeArea, { key: "ArrowDown" });
    }
    fireEvent.keyDown(codeArea, { key: "Enter" });
    fireEvent.keyDown(codeArea, { key: String(item1.correctChoiceIndex) });

    expect(screen.getByTestId("compile-score").textContent).toBe("2");
  });

  it("a wrong answer highlights the right line and shows the explanation", () => {
    const store = memoryStore({
      [COMPILE_KEY]: JSON.stringify({ durationS: 90, groups: ["asan"] }),
    });
    setup(store);

    const item0 = generateCompileItem(SEED, 0, ["asan"]);
    const wrongLine = item0.caseData.line === 1 ? 2 : item0.caseData.line - 1;
    const wrongChoice = item0.choices.find((c) => c.id !== item0.caseData.cause)!;

    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(wrongLine)}` }));
    fireEvent.click(
      within(screen.getByTestId("compile-choices")).getByRole("button", {
        name: new RegExp(wrongChoice.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      }),
    );

    const feedback = screen.getByTestId("compile-feedback");
    expect(feedback.getAttribute("data-outcome")).toBe("wrong");
    expect(feedback.textContent).toContain(item0.caseData.explanation);

    const rightLineBtn = screen.getByRole("button", {
      name: `Linha ${String(item0.caseData.line)}`,
    });
    expect(rightLineBtn.getAttribute("data-correct")).toBe("true");
    expect(screen.getByTestId("compile-score").textContent).toBe("0");

    // Clicking Próximo advances to item 1.
    fireEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    const item1 = generateCompileItem(SEED, 1, ["asan"]);
    expect(screen.getByTestId("compile-output").textContent).toBe(item1.caseData.output);
  });

  it("group filter and duration persist in popis.compile", () => {
    const store = memoryStore();
    setup(store);

    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "60" },
    });
    expect(loadCompileSettings(store).durationS).toBe(60);

    fireEvent.click(screen.getByText("Grupos de erro"));
    const details = screen.getByTestId("compile-groups-details");
    const avisoBox = within(details).getByRole<HTMLInputElement>("checkbox", { name: "Avisos" });
    fireEvent.click(avisoBox);
    expect(loadCompileSettings(store).groups).not.toContain("aviso");
    expect(store.getItem(COMPILE_KEY)).toBeTruthy();
  });

  it("90 s round finishes on fake clock with per-group table and compile.read events", () => {
    const store = memoryStore({
      [COMPILE_KEY]: JSON.stringify({ durationS: 90, groups: ["compilacao", "ubsan"] }),
    });
    setup(store);

    const item0 = generateCompileItem(SEED, 0, ["compilacao", "ubsan"]);
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(item0.caseData.line)}` }));
    fireEvent.keyDown(window, { key: String(item0.correctChoiceIndex) });

    // Trigger a wrong answer too so wrong list appears in Result.
    const item1 = generateCompileItem(SEED, 1, ["compilacao", "ubsan"]);
    const wrongChoice = item1.choices.find((c) => c.id !== item1.caseData.cause)!;
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(item1.caseData.line)}` }));
    fireEvent.click(
      within(screen.getByTestId("compile-choices")).getByRole("button", {
        name: new RegExp(wrongChoice.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      }),
    );

    advance(90_500);

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("compile-group-table")).toBeTruthy();
    expect(screen.getByTestId("compile-wrong-list")).toBeTruthy();
    expect(loadCompileResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.drill === "compile.read")).toBe(true);
    expect(events[0]?.kc).toBe(`compile.${item0.group}`);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);

    // Enter starts a new round from results.
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();
  });

  it("supports skip, restart, Esc exit and opens from the app tree", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "Ler o erro" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/maratona/ler o erro");
    expect(screen.getByRole("heading", { level: 1, name: "Ler o erro" })).toBeTruthy();

    const firstOutput = screen.getByTestId("compile-output").textContent;
    const codeArea = screen.getByTestId("compile-code");
    fireEvent.keyDown(codeArea, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("compile-feedback").getAttribute("data-outcome")).toBe("skipped");
    expect(screen.getByTestId("compile-output").textContent).not.toBe(firstOutput);

    // Esc exits the active round and restores the tree.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });
});
