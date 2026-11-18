// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { deriveSeed } from "../core/rng";
import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
import { DEFAULT_FACTORING, factoring, type FactoringSettings } from "../gen/factoring";
import { loadHistory, memoryStore, SETTINGS_KEY, type KeyValueStore } from "../storage/history";
import { App } from "./App";

const SEED = 5;

/** Always "1 + 1". */
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

function setup(store: KeyValueStore = memoryStore()) {
  render(<App clock={clock} store={store} newSeed={() => SEED} />);
  return store;
}

function storeWith(arithmetic: ArithmeticSettings, durationS = 120): KeyValueStore {
  return memoryStore({ [SETTINGS_KEY]: JSON.stringify({ arithmetic, durationS }) });
}

/** Moves both the injected clock and the timers forward. */
function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

function solve(prompt: string): string {
  const match = /^(\d+) ([+−×÷]) (\d+)$/.exec(prompt);
  if (match === null) throw new Error(`unexpected prompt: ${prompt}`);
  const [a, b] = [Number(match[1]), Number(match[3])];
  const result = { "+": a + b, "−": a - b, "×": a * b, "÷": a / b }[match[2] as "+"];
  return String(result);
}

function start() {
  fireEvent.click(screen.getByRole("button", { name: "Começar" }));
}

function answerBox() {
  return screen.getByRole<HTMLInputElement>("textbox", { name: "Resposta" });
}

function type(text: string) {
  fireEvent.change(answerBox(), { target: { value: text } });
}

function prompt() {
  return screen.getByTestId("prompt").textContent;
}

describe("config screen", () => {
  it("config offers the five durations with 120 s selected", () => {
    setup();
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Duração" });
    const options = within(select).getAllByRole<HTMLOptionElement>("option");
    expect(options.map((o) => o.value)).toEqual(["30", "60", "120", "300", "600"]);
    expect(select.value).toBe("120");
  });

  it("shows the zetamac default ranges", () => {
    setup();
    const value = (name: string) =>
      screen.getByRole<HTMLInputElement>("spinbutton", { name }).value;
    expect(value("Adição: mínimo à esquerda")).toBe("2");
    expect(value("Adição: máximo à direita")).toBe("100");
    expect(value("Multiplicação: máximo à esquerda")).toBe("12");
    expect(value("Multiplicação: máximo à direita")).toBe("100");
    for (const name of ["Adição", "Subtração", "Multiplicação", "Divisão"]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(true);
    }
  });

  it("invalid range disables start and explains why", () => {
    setup();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Adição: mínimo à esquerda" }), {
      target: { value: "500" },
    });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Começar" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/mínimo maior que o máximo/);
  });

  it("no operation disables start", () => {
    setup();
    for (const name of ["Adição", "Subtração", "Multiplicação", "Divisão"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Começar" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/operação/);
  });
});

describe("game screen", () => {
  it("starting shows a problem, the full time and a focused answer box", () => {
    setup();
    start();
    expect(prompt()).toMatch(/^\d+ [+−×÷] \d+$/);
    expect(screen.getByTestId("timer").textContent).toBe("120");
    expect(screen.getByTestId("score").textContent).toBe("0");
    expect(document.activeElement).toBe(answerBox());
  });

  it("correct answer advances without Enter", () => {
    setup();
    start();
    type(solve(prompt() ?? ""));
    expect(screen.getByTestId("score").textContent).toBe("1");
    expect(answerBox().value).toBe("");
  });

  it("wrong answer keeps the problem and the typed text", () => {
    setup();
    start();
    const before = prompt();
    type(String(Number(solve(before ?? "")) + 1));
    expect(prompt()).toBe(before);
    expect(screen.getByTestId("score").textContent).toBe("0");
  });

  it("timer counts down in whole seconds", () => {
    setup();
    start();
    advance(1500);
    expect(screen.getByTestId("timer").textContent).toBe("119");
  });

  it("Escape returns to the config without saving", () => {
    const store = setup();
    start();
    fireEvent.keyDown(answerBox(), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
    expect(loadHistory(store)).toEqual([]);
  });
});

describe("results screen", () => {
  function playTwoAndFinish(store: KeyValueStore) {
    setup(store);
    start();
    advance(1500);
    type("2");
    advance(500);
    type("2");
    advance(120_000);
  }

  it("results show score, per-operation mean and slowest problems", () => {
    playTwoAndFinish(storeWith(ONE_PLUS_ONE));
    expect(screen.getByTestId("final-score").textContent).toBe("2");

    const perOp = screen.getByRole("table", { name: "Por operação" });
    const opRow = within(perOp).getAllByRole("row")[1];
    expect(opRow?.textContent).toContain("Adição");
    expect(opRow?.textContent).toContain("2");
    expect(opRow?.textContent).toContain("1,00 s");

    const slowest = screen.getByRole("table", { name: "Mais lentas" });
    const rows = within(slowest).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[2]?.textContent)).toEqual([
      "1,50 s",
      "0,50 s",
    ]);
    expect(rows[0]?.textContent).toContain("1 + 1");
  });

  it("results show the seed of slow problems", () => {
    playTwoAndFinish(storeWith(ONE_PLUS_ONE));
    const slowest = screen.getByRole("table", { name: "Mais lentas" });
    const firstRow = within(slowest).getAllByRole("row")[1];
    expect(firstRow?.textContent).toContain(String(deriveSeed(SEED, 0)));
  });

  it("finished session is saved", () => {
    const store = storeWith(ONE_PLUS_ONE);
    playTwoAndFinish(store);
    const history = loadHistory(store);
    expect(history).toHaveLength(1);
    expect(history[0]?.seed).toBe(SEED);
    expect(history[0]?.log.filter((a) => a.outcome === "correct")).toHaveLength(2);
  });

  it("configure returns to the config with the same settings", () => {
    playTwoAndFinish(storeWith(ONE_PLUS_ONE, 30));
    fireEvent.click(screen.getByRole("button", { name: "Configurar" }));
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Duração" }).value).toBe("30");
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Divisão" }).checked).toBe(false);
  });

  it("play again starts a new session with the same settings", () => {
    playTwoAndFinish(storeWith(ONE_PLUS_ONE));
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(prompt()).toBe("1 + 1");
    expect(screen.getByTestId("score").textContent).toBe("0");
  });
});

describe("persistence", () => {
  it("settings are remembered", () => {
    const store = memoryStore();
    setup(store);
    fireEvent.change(screen.getByRole("combobox", { name: "Duração" }), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Divisão" }));
    start();
    fireEvent.keyDown(answerBox(), { key: "Escape" });
    document.body.innerHTML = "";

    setup(store);
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Duração" }).value).toBe("30");
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Divisão" }).checked).toBe(false);
  });
});

describe("factoring mode", () => {
  function factoringStore(settings: FactoringSettings = DEFAULT_FACTORING): KeyValueStore {
    return memoryStore({
      [SETTINGS_KEY]: JSON.stringify({
        mode: "factoring",
        arithmetic: DEFAULT_ARITHMETIC,
        factoring: settings,
        durationS: 60,
      }),
    });
  }

  /** The i-th problem of the session seeded with SEED. */
  function nth(i: number, settings: FactoringSettings = DEFAULT_FACTORING) {
    return factoring.generate(deriveSeed(SEED, i), settings);
  }

  it("mode choice shows the factoring levels and hides the operations", () => {
    setup();
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Aritmética" }).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Fatoração" }));
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /^Nível 1/ }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /^Nível 6/ }).checked).toBe(
      false,
    );
    expect(screen.queryByRole("checkbox", { name: "Adição" })).toBeNull();
  });

  it("no level disables start", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Fatoração" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Nível 1/ }));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Começar" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/nível/);
  });

  it("shows the polynomial and accepts the factored answer without Enter", () => {
    setup(factoringStore());
    start();
    expect(prompt()).toBe(nth(0).prompt);
    type(nth(0).answer);
    expect(screen.getByTestId("score").textContent).toBe("1");
    expect(prompt()).toBe(nth(1).prompt);
  });

  it("Enter skips and shows the skipped problem with its answer", () => {
    setup(factoringStore());
    start();
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(prompt()).toBe(nth(1).prompt);
    expect(screen.getByTestId("score").textContent).toBe("0");
    const skipped = screen.getByTestId("skipped").textContent;
    expect(skipped).toContain(nth(0).prompt);
    expect(skipped).toContain(nth(0).answer);
  });

  it("Enter does nothing in arithmetic", () => {
    const store = storeWith(ONE_PLUS_ONE);
    setup(store);
    start();
    type("3");
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(answerBox().value).toBe("3");
    expect(screen.queryByTestId("skipped")).toBeNull();
    advance(120_000);
    expect(loadHistory(store)[0]?.log.map((a) => a.outcome)).toEqual(["timeout"]);
  });

  it("results list skipped problems with their answers and stats by type", () => {
    const store = factoringStore();
    setup(store);
    start();
    advance(2000);
    type(nth(0).answer);
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    advance(60_000);

    const byType = screen.getByRole("table", { name: "Por tipo" });
    expect(within(byType).getAllByRole("row")[1]?.textContent).toContain("Quadrática mônica");

    const skipped = screen.getByRole("table", { name: "Puladas" });
    const row = within(skipped).getAllByRole("row")[1];
    expect(row?.textContent).toContain(nth(1).prompt);
    expect(row?.textContent).toContain(nth(1).answer);
  });

  it("finished factoring session is saved with its mode", () => {
    const store = factoringStore();
    setup(store);
    start();
    advance(60_000);
    expect(loadHistory(store)[0]?.mode).toBe("factoring");
    expect(loadHistory(store)[0]?.params).toEqual(DEFAULT_FACTORING);
  });

  it("factoring settings are remembered", () => {
    const store = memoryStore();
    setup(store);
    fireEvent.click(screen.getByRole("radio", { name: "Fatoração" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Nível 2/ }));
    start();
    fireEvent.keyDown(answerBox(), { key: "Escape" });
    document.body.innerHTML = "";

    setup(store);
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Fatoração" }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /^Nível 2/ }).checked).toBe(true);
  });
});
