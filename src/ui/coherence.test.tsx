// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
import {
  HISTORY_KEY,
  memoryStore,
  SETTINGS_KEY,
  type KeyValueStore,
  type SessionRecord,
} from "../storage/history";
import { VIM_SETTINGS_KEY } from "../storage/vim";
import { App } from "./App";
import { ITEMS } from "./shell/sections";

// T19: UI coherence across every training screen.

const ONE_PLUS_ONE: ArithmeticSettings = {
  ...DEFAULT_ARITHMETIC,
  operations: ["add"],
  addLeft: { min: 1, max: 1 },
  addRight: { min: 1, max: 1 },
};

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(store: KeyValueStore = memoryStore(), narrow = false) {
  let seed = 10;
  const newSeed = vi.fn(() => {
    seed += 1;
    return seed;
  });
  const view = render(<App clock={clock} store={store} newSeed={newSeed} narrow={narrow} />);
  return { store, view, newSeed };
}

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>("radio", { name });
const status = () => screen.getByTestId("shell-status").textContent ?? "";

function typeInto(box: HTMLElement, text: string) {
  fireEvent.change(box, { target: { value: text } });
}

describe("T19 AC-1: uniform training keys", () => {
  it("training keys are uniform across screens", () => {
    const { newSeed } = setup();

    // Calculation (Fatoração)
    fireEvent.click(radio("Fatoração"));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    const answerBox = screen.getByRole("textbox", { name: "Resposta" });
    const firstPrompt = screen.getByTestId("prompt").textContent;
    fireEvent.keyDown(answerBox, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("skipped")).toBeTruthy();
    expect(screen.getByTestId("prompt").textContent).not.toBe(firstPrompt);

    const seedsBeforeRestart = newSeed.mock.calls.length;
    fireEvent.keyDown(answerBox, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(seedsBeforeRestart);
    expect(screen.queryByTestId("skipped")).toBeNull();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();

    // Code typing (Código)
    fireEvent.click(radio("Código"));
    const codeBox = screen.getByRole("textbox", { name: "Código digitado" });
    typeInto(codeBox, "a");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    const codeSeeds1 = newSeed.mock.calls.length;
    fireEvent.keyDown(codeBox, { key: "Enter", ctrlKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(codeSeeds1);

    typeInto(codeBox, "a");
    const codeSeeds2 = newSeed.mock.calls.length;
    fireEvent.keyDown(codeBox, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(codeSeeds2);

    typeInto(codeBox, "a");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    fireEvent.keyDown(codeBox, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();

    // Text typing (Texto)
    fireEvent.click(radio("Texto"));
    const textBox = screen.getByRole("textbox", { name: "Texto digitado" });
    typeInto(textBox, "a");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    const textSeeds1 = newSeed.mock.calls.length;
    fireEvent.keyDown(textBox, { key: "Enter", ctrlKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(textSeeds1);

    typeInto(textBox, "a");
    const textSeeds2 = newSeed.mock.calls.length;
    fireEvent.keyDown(textBox, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(textSeeds2);

    typeInto(textBox, "a");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    fireEvent.keyDown(textBox, { key: "Escape" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });

  it("vim drills exit with :q and keep Esc for vim", () => {
    const { newSeed } = setup();

    // Vim Motion
    fireEvent.click(radio("Movimento"));
    const motionBox = screen.getByRole("textbox", { name: "Teclas do Vim" });
    typeInto(motionBox, "l");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    // Esc stays in Vim (does not exit the round)
    fireEvent.keyDown(motionBox, { key: "Escape" });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    // Ctrl+Enter skips, Ctrl+Shift+Enter restarts with a new seed
    const idxBefore = screen.getByTestId("vim-code").getAttribute("data-target-index");
    fireEvent.keyDown(motionBox, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("vim-code").getAttribute("data-target-index")).not.toBe(idxBefore);

    const motionSeeds = newSeed.mock.calls.length;
    fireEvent.keyDown(motionBox, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(motionSeeds);

    // :q + Enter exits the round
    typeInto(motionBox, "l");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    typeInto(motionBox, ":q");
    expect(screen.getByTestId("vim-status").textContent).toContain(":q");
    fireEvent.keyDown(motionBox, { key: "Enter" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();

    // Vim Edit
    fireEvent.click(radio("Edição"));
    const editBox = screen.getByRole("textbox", { name: "Teclas do Vim" });
    typeInto(editBox, "l");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    fireEvent.keyDown(editBox, { key: "Escape" });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();

    const editSeeds = newSeed.mock.calls.length;
    fireEvent.keyDown(editBox, { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(newSeed.mock.calls.length).toBeGreaterThan(editSeeds);

    typeInto(editBox, "l");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    typeInto(editBox, ":q");
    fireEvent.keyDown(editBox, { key: "Enter" });
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();

    // Vim Learn
    fireEvent.click(radio("Aprender"));
    const firstLesson = within(screen.getByRole("list", { name: "Lições" })).getAllByRole(
      "button",
    )[0] as HTMLElement;
    fireEvent.click(firstLesson);
    const learnBox = screen.getByRole("textbox", { name: "Teclas do Vim" });
    typeInto(learnBox, ":q");
    fireEvent.keyDown(learnBox, { key: "Enter" });
    expect(screen.queryByTestId("learn-explanation")).toBeNull();
  });

  it("status line and help use the shared keys table without loose hints", () => {
    setup();
    for (const label of ["Código", "Texto", "Movimento", "Edição"]) {
      fireEvent.click(radio(label));
      expect(document.querySelector(".hint")).toBeNull();
    }

    fireEvent.click(radio("Aritmética"));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(status()).toContain("Ctrl+Enter");
    expect(status()).toContain("Ctrl+Shift+Enter");
    expect(status()).toContain("Esc");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });

    fireEvent.click(radio("Movimento"));
    typeInto(screen.getByRole("textbox", { name: "Teclas do Vim" }), "l");
    expect(status()).toContain(":q");
    expect(status()).toContain("Ctrl+Enter");
    expect(status()).toContain("Ctrl+Shift+Enter");
    typeInto(screen.getByRole("textbox", { name: "Teclas do Vim" }), ":q");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Teclas do Vim" }), { key: "Enter" });

    fireEvent.keyDown(document.body, { key: "?" });
    const help = screen.getByRole("dialog", { name: "Atalhos" }).textContent ?? "";
    expect(help).toContain("Ctrl+Enter");
    expect(help).toContain("Ctrl+Shift+Enter");
    expect(help).toContain(":q");
  });
});

describe("T19 AC-2: unique h1 titles", () => {
  it("every tree item renders a unique h1 matching its label", () => {
    setup();
    const seen = new Set<string>();
    for (const item of ITEMS) {
      fireEvent.click(radio(item.label));
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1.textContent).toBe(item.label);
      seen.add(h1.textContent ?? "");
    }
    expect(seen.size).toBe(ITEMS.length);
  });
});

describe("T19 AC-3: shared RoundBar", () => {
  it("every training screen renders time or progress and score in RoundBar", () => {
    setup();

    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.getByTestId("round-bar").textContent).toContain("tempo");
    expect(screen.getByTestId("round-bar").textContent).toContain("acertos");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });

    fireEvent.click(radio("Código"));
    expect(screen.getByTestId("round-bar").textContent).toContain("tempo");

    fireEvent.click(radio("Texto"));
    expect(screen.getByTestId("round-bar").textContent).toContain("tempo");

    fireEvent.click(radio("Movimento"));
    expect(screen.getByTestId("round-bar").textContent).toContain("tempo");
    expect(screen.getByTestId("round-bar").textContent).toContain("alvos");

    fireEvent.click(radio("Edição"));
    expect(screen.getByTestId("round-bar").textContent).toContain("tempo");
    expect(screen.getByTestId("round-bar").textContent).toContain("edições");
  });
});

describe("T19 AC-4: shared Result component", () => {
  it("every training screen uses Result with Jogar de novo and seed", () => {
    setup();

    // Text typing (timed 15s or default 30s)
    fireEvent.click(radio("Texto"));
    typeInto(screen.getByRole("textbox", { name: "Texto digitado" }), "a");
    advance(61_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jogar de novo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();

    // Vim Motion
    fireEvent.click(radio("Movimento"));
    typeInto(screen.getByRole("textbox", { name: "Teclas do Vim" }), "l");
    advance(61_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jogar de novo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();

    // Vim Edit
    fireEvent.click(radio("Edição"));
    typeInto(screen.getByRole("textbox", { name: "Teclas do Vim" }), "l");
    advance(61_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jogar de novo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();
  });

  it("calculation results with zero hits still show skipped items and record", () => {
    const prior: SessionRecord = {
      version: 1,
      mode: "arithmetic",
      finishedAt: 0,
      durationMs: 30_000,
      seed: 1,
      params: ONE_PLUS_ONE,
      log: Array.from({ length: 7 }, () => ({
        problem: { skill: "arithmetic.add", prompt: "1 + 1", answer: "2", seed: 1, params: null },
        outcome: "correct" as const,
        timeMs: 1000,
        corrections: 0,
      })),
    };
    const store = memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ arithmetic: ONE_PLUS_ONE, durationS: 30 }),
      [HISTORY_KEY]: JSON.stringify([prior]),
    });
    setup(store);
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), {
      key: "Enter",
      ctrlKey: true,
    });
    advance(31_000);
    expect(screen.getByTestId("result")).toBeTruthy();
    expect(screen.getByTestId("results-solved").textContent).toContain("0 resolvidas");
    const pairs = screen.getByTestId("results-pairs").textContent ?? "";
    expect(pairs).toContain("puladas1");
    expect(pairs).toContain("seu recorde7");
    expect(screen.getByRole("table", { name: "Puladas" })).toBeTruthy();
  });
});

describe("T19 AC-5: shared History component", () => {
  it("every training item uses the shared History component and empty message", () => {
    setup();
    const empty = "Nenhuma rodada nesta configuração. Enter começa a primeira.";
    for (const label of ["Aritmética", "Código", "Texto", "Movimento", "Edição"]) {
      fireEvent.click(radio(label));
      const history = document.querySelector("[data-panel=history]");
      expect(history?.textContent).toBe(empty);
    }
  });
});

describe("T19 AC-6: uniform controls", () => {
  it("no bordered fieldset appears outside reference panels", () => {
    setup();
    for (const item of ITEMS) {
      fireEvent.click(radio(item.label));
      const fieldsets = Array.from(document.querySelectorAll("fieldset")).filter(
        (fs) => fs.closest("[data-panel=reference]") === null,
      );
      expect(fieldsets).toHaveLength(0);
    }
  });

  it("arithmetic ranges keep each parenthesized interval together", () => {
    setup();
    const groups = document.querySelectorAll(".range-group");
    expect(groups.length).toBeGreaterThanOrEqual(4);
    const css = readFileSync("src/ui/app.css", "utf8");
    expect(css).toContain(".range-group");
    expect(css).toContain("white-space: nowrap");
  });
});

describe("T19 AC-7: compact Vim Edit", () => {
  it("vim edit groups kinds by family, collapsed by default, with one locked notice", () => {
    setup();
    fireEvent.click(radio("Edição"));

    expect(document.querySelector(".vim-buffers")).not.toBeNull();
    const kindsDetails = screen.getByTestId<HTMLDetailsElement>("vim-kinds-details");
    expect(kindsDetails.tagName).toBe("DETAILS");
    expect(kindsDetails.open).toBe(false);

    expect(within(kindsDetails).getByText("Edição")).toBeTruthy();
    expect(within(kindsDetails).getByText("Visual e blocos")).toBeTruthy();
    expect(within(kindsDetails).getByText("Registradores e macros")).toBeTruthy();

    expect(kindsDetails.textContent).not.toContain("(libere em Aprender)");
    const notice = screen.getByTestId("vim-locked-notice");
    const link = within(notice).getByRole("button", { name: "Aprender" });
    fireEvent.click(link);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Aprender");
  });
});

describe("T19 AC-8: cumulative Vim Motion commands", () => {
  it("vim motion commands show current level and earlier levels collapsed under já valem", () => {
    const store = memoryStore({
      [VIM_SETTINGS_KEY]: JSON.stringify({ level: 4, durationS: 60 }),
    });
    setup(store);
    fireEvent.click(radio("Movimento"));

    const earlier = screen.getByTestId<HTMLDetailsElement>("vim-earlier-commands");
    expect(earlier.tagName).toBe("DETAILS");
    expect(earlier.open).toBe(false);
    expect(earlier.querySelector("summary")?.textContent).toContain("já valem");
    expect(earlier.textContent).toContain("h");
    expect(earlier.textContent).toContain("w");
  });
});

describe("T19 AC-9: mobile game layout", () => {
  it("mobile game CSS stacks prompt above answer in --text-xxl", () => {
    const css = readFileSync("src/ui/app.css", "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width: 48rem)"));
    expect(mobile).toContain("flex-direction: column");
    expect(mobile).toContain("var(--text-xxl)");
  });
});

describe("T19 edge cases", () => {
  it("covers Tab in text typing, elapsed timer in code typing, warning tone in RoundBar and Vim motion cmdline edits", () => {
    setup();

    // RoundBar warning tone when <= 10s remain in GameScreen
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    advance(115_000);
    expect(screen.getByTestId("timer").className).toContain("warning");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });

    // Code typing elapsed timer ticks while running
    fireEvent.click(radio("Código"));
    const codeBox = screen.getByRole("textbox", { name: "Código digitado" });
    typeInto(codeBox, "a");
    advance(1100);
    expect(screen.getByTestId("round-bar").textContent).toContain("1 s");
    fireEvent.keyDown(codeBox, { key: "Escape" });

    // Text typing ignores Tab
    fireEvent.click(radio("Texto"));
    const textBox = screen.getByRole("textbox", { name: "Texto digitado" });
    expect(fireEvent.keyDown(textBox, { key: "Tab" })).toBe(false);

    // Vim Motion cmdline: Backspace, Escape, and unknown command + Enter
    fireEvent.click(radio("Movimento"));
    const motionBox = screen.getByRole("textbox", { name: "Teclas do Vim" });
    typeInto(motionBox, ":w");
    fireEvent.keyDown(motionBox, { key: "Backspace" });
    expect(screen.getByTestId("vim-status").textContent).toContain(":");
    fireEvent.keyDown(motionBox, { key: "Backspace" });
    expect(screen.getByTestId("vim-status").textContent).toContain("NORMAL");

    typeInto(motionBox, ":q");
    fireEvent.keyDown(motionBox, { key: "Escape" });
    expect(screen.getByTestId("vim-status").textContent).toContain("NORMAL");

    typeInto(motionBox, ":x");
    fireEvent.keyDown(motionBox, { key: "Enter" });
    expect(screen.getByTestId("vim-status").textContent).toContain("NORMAL");
  });
});
