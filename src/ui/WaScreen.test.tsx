// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { WA_KEY, loadWaResults, loadWaSettings } from "../storage/wa";
import { generateWaItem } from "../wa/drill";
import { App } from "./App";
import { WaScreen } from "./WaScreen";

// T41 AC-4: Caça ao WA screen — shared T40 line & class pickers, untimed 5-case round with
// stopwatch, counterexample + wrong/expected output + fix diff on answer, popis.wa & wa.hunt events.

const SEED = 41;
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
    <WaScreen
      clock={clock}
      store={store}
      newSeed={newSeed}
      onBack={onBack}
      onRunning={onRunning}
    />,
  );
  return { store, onRunning, onBack, newSeed };
}

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("WaScreen (AC-4)", () => {
  it("correct and wrong answers reveal breaking input, wrong vs expected output and fix diff", () => {
    const store = memoryStore({
      [WA_KEY]: JSON.stringify({ classes: ["overflow", "borda"] }),
    });
    setup(store);

    const item0 = generateWaItem(SEED, 0, ["overflow", "borda"]);
    expect(screen.getByTestId("wa-progress").textContent).toBe("1/5");
    expect(screen.getByTestId("wa-time").textContent).toBe("0 s");
    expect(screen.getByTestId("wa-statement").textContent).toContain(item0.caseData.statement);
    expect(screen.getByTestId("wa-sample").textContent).toContain(
      item0.caseData.sample_input.trim(),
    );

    // Answer item 0 correctly via two clicks: line then class.
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(item0.caseData.line)}` }));
    expect(screen.getByTestId("wa-step").textContent).toContain(
      `Linha ${String(item0.caseData.line)}`,
    );
    fireEvent.click(
      within(screen.getByTestId("wa-choices")).getByRole("button", {
        name: new RegExp(escapeRe(item0.choices[item0.correctChoiceIndex - 1]!.label)),
      }),
    );

    expect(screen.getByTestId("wa-score").textContent).toBe("1");
    const feedback0 = screen.getByTestId("wa-feedback");
    expect(feedback0.getAttribute("data-outcome")).toBe("correct");
    expect(screen.getByTestId("wa-breaking-input").textContent).toBe(
      item0.caseData.breaking_input.trimEnd(),
    );
    expect(screen.getByTestId("wa-wrong-output").textContent).toBe(
      item0.caseData.wrong_output.trimEnd(),
    );
    expect(screen.getByTestId("wa-expected-output").textContent).toBe(
      item0.caseData.expected_output.trimEnd(),
    );
    expect(screen.getByTestId("wa-diff").textContent).toContain("-");
    expect(screen.getByTestId("wa-diff").textContent).toContain("+");

    // Advance to item 1 via button.
    fireEvent.click(screen.getByRole("button", { name: /Próximo/ }));
    const item1 = generateWaItem(SEED, 1, ["overflow", "borda"]);
    expect(screen.getByTestId("wa-progress").textContent).toBe("2/5");

    // Answer item 1 wrongly: highlights correct line/class and reveals counterexample + explanation.
    const wrongLine = item1.caseData.line === 1 ? 2 : item1.caseData.line - 1;
    const wrongChoice = item1.choices.find((c) => c.id !== item1.caseData.class)!;
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(wrongLine)}` }));
    fireEvent.click(
      within(screen.getByTestId("wa-choices")).getByRole("button", {
        name: new RegExp(escapeRe(wrongChoice.label)),
      }),
    );

    const feedback1 = screen.getByTestId("wa-feedback");
    expect(feedback1.getAttribute("data-outcome")).toBe("wrong");
    expect(feedback1.textContent).toContain(item1.caseData.explanation);
    expect(
      screen
        .getByRole("button", { name: `Linha ${String(item1.caseData.line)}` })
        .getAttribute("data-correct"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: `Linha ${String(wrongLine)}` }).getAttribute("data-wrong"),
    ).toBe("true");
    expect(screen.getByTestId("wa-breaking-input").textContent).toBe(
      item1.caseData.breaking_input.trimEnd(),
    );
  });

  it("supports keyboard arrows + Enter + 1-4, class-first pick, skip, restart, Esc exit and 5-case completion with wa.hunt events", () => {
    const store = memoryStore({
      [WA_KEY]: JSON.stringify({ classes: ["overflow", "stl", "limite"] }),
    });
    const { onBack, newSeed } = setup(store);
    const activeClasses = ["overflow", "stl", "limite"] as const;

    // Case 1: keyboard navigation (ArrowDown, ArrowUp, ArrowDown to target line, Enter, then shortcut 1-4).
    const item0 = generateWaItem(SEED, 0, activeClasses);
    const codeArea = screen.getByTestId("wa-code");
    fireEvent.keyDown(codeArea, { key: "ArrowDown" });
    fireEvent.keyDown(codeArea, { key: "ArrowUp" });
    for (let i = 1; i < item0.caseData.line; i++) {
      fireEvent.keyDown(codeArea, { key: "ArrowDown" });
    }
    fireEvent.keyDown(codeArea, { key: "Enter" });
    advance(2_100);
    expect(screen.getByTestId("wa-time").textContent).toBe("2 s");
    fireEvent.keyDown(codeArea, { key: String(item0.correctChoiceIndex) });
    expect(screen.getByTestId("wa-feedback").getAttribute("data-outcome")).toBe("correct");

    // Ignored key during review, then Space/Enter advances.
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("wa-progress").textContent).toBe("2/5");

    // Case 2: class-first selection, then line click, then advance.
    const item1 = generateWaItem(SEED, 1, activeClasses);
    fireEvent.keyDown(window, { key: String(item1.correctChoiceIndex) });
    expect(screen.getByTestId("wa-step").textContent).toContain("Classe selecionada");
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(item1.caseData.line)}` }));
    expect(screen.getByTestId("wa-score").textContent).toBe("2");
    fireEvent.keyDown(window, { key: " " });

    // Case 3: skipped via Ctrl+Enter.
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("wa-feedback").getAttribute("data-outcome")).toBe("skipped");
    expect(screen.getByTestId("wa-progress").textContent).toBe("4/5");

    // Case 4: wrong answer + advance.
    const item3 = generateWaItem(SEED, 3, activeClasses);
    const wrongChoice = item3.choices.find((c) => c.id !== item3.caseData.class)!;
    fireEvent.click(screen.getByRole("button", { name: "Linha 1" }));
    fireEvent.click(
      within(screen.getByTestId("wa-choices")).getByRole("button", {
        name: new RegExp(escapeRe(wrongChoice.label)),
      }),
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("wa-progress").textContent).toBe("5/5");

    // Case 5: answer and advance via "Ver resultado" button to finish the round.
    const item4 = generateWaItem(SEED, 4, activeClasses);
    fireEvent.click(screen.getByRole("button", { name: `Linha ${String(item4.caseData.line)}` }));
    fireEvent.keyDown(window, { key: String(item4.correctChoiceIndex) });
    fireEvent.click(screen.getByRole("button", { name: /Ver resultado/ }));

    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("wa-final-score").textContent).toContain("3/5");
    expect(screen.getByTestId("wa-class-table")).toBeTruthy();
    expect(screen.getByTestId("wa-wrong-list")).toBeTruthy();
    expect(loadWaResults(store)).toHaveLength(1);

    const events = loadEvents(store);
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.drill === "wa.hunt")).toBe(true);
    expect(events[0]?.kc).toBe(`wa.${item0.bugClass}`);
    expect(events[0]?.ok).toBe(true);
    expect(events[2]?.extra["skipped"]).toBe(true);
    expect(events[3]?.ok).toBe(false);

    // Enter starts a new round from results.
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.queryByTestId("result")).toBeNull();

    // Ctrl+Shift+Enter restarts with a new seed, Esc exits active round, Ctrl+a ignored.
    const seedsBefore = newSeed.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Linha 1" }));
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(seedsBefore);

    // Complete a second round by skipping all 5 (zero wrong items branch), then Esc from results.
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(screen.getByTestId("wa-code"), { key: "Enter", ctrlKey: true });
    }
    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.queryByTestId("wa-wrong-list")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.queryByTestId("result")).toBeNull();

    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(screen.getByTestId("wa-code"), { key: "Enter", ctrlKey: true });
    }
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("result")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("class filter persists in popis.wa and opens from Maratona in App", () => {
    const store = memoryStore();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    fireEvent.click(screen.getByRole("radio", { name: "Caça ao WA" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/maratona/caça ao wa");
    expect(screen.getByRole("heading", { level: 1, name: "Caça ao WA" })).toBeTruthy();

    // Toggle a class checkbox and confirm persistence in popis.wa.
    fireEvent.click(screen.getByText("Classes de bug"));
    const details = screen.getByTestId("wa-classes-details");
    const stlBox = within(details).getByRole<HTMLInputElement>("checkbox", {
      name: "Armadilha da STL",
    });
    fireEvent.click(stlBox);
    expect(loadWaSettings(store).classes).not.toContain("stl");
    expect(store.getItem(WA_KEY)).toBeTruthy();

    // Start round by picking line 1, then Esc restores tree.
    fireEvent.click(screen.getByRole("button", { name: "Linha 1" }));
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });
});
