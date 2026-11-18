// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { deriveSeed } from "../core/rng";
import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
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
  return screen.getByRole("textbox", { name: "Resposta" });
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
    const select = screen.getByRole("combobox", { name: "Duração" });
    const options = within(select).getAllByRole("option") as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual(["30", "60", "120", "300", "600"]);
    expect((select as HTMLSelectElement).value).toBe("120");
  });

  it("shows the zetamac default ranges", () => {
    setup();
    const value = (name: string) =>
      (screen.getByRole("spinbutton", { name }) as HTMLInputElement).value;
    expect(value("Adição: mínimo à esquerda")).toBe("2");
    expect(value("Adição: máximo à direita")).toBe("100");
    expect(value("Multiplicação: máximo à esquerda")).toBe("12");
    expect(value("Multiplicação: máximo à direita")).toBe("100");
    for (const name of ["Adição", "Subtração", "Multiplicação", "Divisão"]) {
      expect((screen.getByRole("checkbox", { name }) as HTMLInputElement).checked).toBe(true);
    }
  });

  it("invalid range disables start and explains why", () => {
    setup();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Adição: mínimo à esquerda" }), {
      target: { value: "500" },
    });
    expect((screen.getByRole("button", { name: "Começar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/mínimo maior que o máximo/);
  });

  it("no operation disables start", () => {
    setup();
    for (const name of ["Adição", "Subtração", "Multiplicação", "Divisão"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    expect((screen.getByRole("button", { name: "Começar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
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
    expect((answerBox() as HTMLInputElement).value).toBe("");
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
    expect((screen.getByRole("combobox", { name: "Duração" }) as HTMLSelectElement).value).toBe(
      "30",
    );
    expect((screen.getByRole("checkbox", { name: "Divisão" }) as HTMLInputElement).checked).toBe(
      false,
    );
  });
});
