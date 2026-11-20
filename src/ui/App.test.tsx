// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { deriveSeed } from "../core/rng";
import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
import { DEFAULT_FACTORING, factoring, type FactoringSettings } from "../gen/factoring";
import { algebra, type AlgebraSettings } from "../gen/algebra";
import { division, DIVISION_KINDS, type DivisionSettings } from "../gen/division";
import type { Problem } from "../core/problem";
import { estimation, type EstimationSettings } from "../gen/estimation";
import { primes, type PrimesSettings } from "../gen/primes";
import { sums, type SumsSettings } from "../gen/sums";
import {
  HISTORY_KEY,
  loadHistory,
  loadSettings,
  memoryStore,
  SETTINGS_KEY,
  type KeyValueStore,
  type SessionRecord,
} from "../storage/history";
import { MODE_IDS } from "../modes";
import { App } from "./App";
import { answerText } from "./format";

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
  it("config shows the POPIS acronym spelled out with bold initials", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "POPIS" })).toBeTruthy();
    const full = screen.getByTestId("brand-acronym");
    expect(full.textContent).toBe("Practice Of Problem-solving In Sprints");
    expect(full.className).toContain("muted");
    const initials = Array.from(full.querySelectorAll("strong")).map((s) => s.textContent);
    expect(initials).toEqual(["P", "O", "P", "I", "S"]);
  });

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

describe("typing entry", () => {
  it("config has a Digitação button that opens the typing screen and comes back", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Digitação" }));
    expect(screen.getByTestId("typing-code")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
  });
});

describe("text typing entry", () => {
  it("config has a Texto button that opens the text typing screen and comes back", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Texto" }));
    expect(screen.getByRole("textbox", { name: "Texto digitado" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
  });
});

describe("vim entry", () => {
  it("config has a Vim button that opens the Vim screen and comes back", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Vim" }));
    expect(screen.getByRole("textbox", { name: "Teclas do Vim" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
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

  it.each(MODE_IDS.filter((m) => m !== "review"))(
    "answer box turns off autocapitalize and autocorrect in %s",
    (mode) => {
      setup(memoryStore({ [SETTINGS_KEY]: JSON.stringify({ mode, durationS: 30 }) }));
      start();
      expect(answerBox().getAttribute("autocapitalize")).toBe("off");
      expect(answerBox().getAttribute("autocorrect")).toBe("off");
      expect(answerBox().getAttribute("spellcheck")).toBe("false");
    },
  );

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

describe("division mode", () => {
  const ONLY_FLOOR: DivisionSettings = { kinds: ["floor"] };

  function divisionStore(settings: DivisionSettings = ONLY_FLOOR): KeyValueStore {
    return memoryStore({
      [SETTINGS_KEY]: JSON.stringify({
        mode: "division",
        arithmetic: DEFAULT_ARITHMETIC,
        division: settings,
        durationS: 30,
      }),
    });
  }

  function nth(i: number) {
    return division.generate(deriveSeed(SEED, i), ONLY_FLOOR);
  }

  it("division mode lists its kinds, all checked by default", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Divisão inteira" }));
    for (const name of [
      /^C\+\+: a \/ b/,
      /^C\+\+: a % b/,
      /^Piso/,
      /^Teto/,
      /^a mod b/,
      /^Desigualdades/,
    ]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(true);
    }
  });

  it("division mode without kinds disables start", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Divisão inteira" }));
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Começar" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/tipo/);
  });

  it("division mode accepts a negative answer typed with a hyphen", () => {
    setup(divisionStore());
    start();
    expect(prompt()).toBe(nth(0).prompt);
    type(nth(0).answer.replace("−", "-"));
    expect(screen.getByTestId("score").textContent).toBe("1");
  });

  it("Enter skips in division", () => {
    setup(divisionStore());
    start();
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(screen.getByTestId("skipped").textContent).toContain(nth(0).prompt);
    expect(prompt()).toBe(nth(1).prompt);
  });

  it("checking a kind again puts it back in menu order", () => {
    const store = memoryStore();
    setup(store);
    fireEvent.click(screen.getByRole("radio", { name: "Divisão inteira" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^C\+\+: a \/ b/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^C\+\+: a \/ b/ }));
    start();
    expect(loadSettings(store).division.kinds).toEqual(DIVISION_KINDS);
  });

  it("division settings are remembered", () => {
    const store = memoryStore();
    setup(store);
    fireEvent.click(screen.getByRole("radio", { name: "Divisão inteira" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Teto/ }));
    start();
    fireEvent.keyDown(answerBox(), { key: "Escape" });
    document.body.innerHTML = "";

    setup(store);
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Divisão inteira" }).checked).toBe(
      true,
    );
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /^Teto/ }).checked).toBe(false);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /^Piso/ }).checked).toBe(true);
  });
});

describe("algebra mode", () => {
  const ONLY_EXPAND: AlgebraSettings = { kinds: ["expand"] };
  const store = () =>
    memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ mode: "algebra", algebra: ONLY_EXPAND, durationS: 30 }),
    });
  const nth = (i: number) => algebra.generate(deriveSeed(SEED, i), ONLY_EXPAND);

  it("algebra mode lists its kinds", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Álgebra" }));
    for (const name of [/^Expandir/, /^Simplificar/, /^Completar o quadrado/, /^Dividir/]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(true);
    }
  });

  it("algebra settings are remembered", () => {
    const saved = memoryStore();
    setup(saved);
    fireEvent.click(screen.getByRole("radio", { name: "Álgebra" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Dividir/ }));
    start();
    expect(loadSettings(saved).algebra.kinds).toEqual(["expand", "simplify", "square"]);
  });

  it("algebra mode accepts the expanded answer and skips with Enter", () => {
    setup(store());
    start();
    expect(prompt()).toBe(nth(0).prompt);
    type(nth(0).answer);
    expect(screen.getByTestId("score").textContent).toBe("1");
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(screen.getByTestId("skipped").textContent).toContain(nth(1).answer);
  });
});

describe("review mode", () => {
  const FLOOR: DivisionSettings = { kinds: ["floor"] };
  const floor = (seed: number) => division.generate(seed, FLOOR);

  function skippedSession(problems: readonly Problem[]): SessionRecord {
    return {
      version: 1,
      mode: "division",
      finishedAt: 0,
      durationMs: 30_000,
      seed: 1,
      params: FLOOR,
      log: problems.map((problem) => ({
        problem,
        outcome: "skipped",
        timeMs: 1000,
        corrections: 0,
      })),
    };
  }

  function reviewStore(problems: readonly Problem[]): KeyValueStore {
    return memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ mode: "review", durationS: 30 }),
      [HISTORY_KEY]: JSON.stringify([skippedSession(problems)]),
    });
  }

  it("review mode without history disables start and says there is nothing to review", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Revisar" }));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Começar" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Nada para revisar ainda");
  });

  it("review mode shows how many questions there are to review", () => {
    setup(reviewStore([floor(1), floor(2)]));
    expect(screen.getByTestId("review-count").textContent).toBe("2 questões para revisar");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Começar" }).disabled).toBe(false);
  });

  it("review mode counts a single question in the singular", () => {
    setup(reviewStore([floor(1)]));
    expect(screen.getByTestId("review-count").textContent).toBe("1 questão para revisar");
  });

  it("review mode replays the skipped problem and accepts its answer", () => {
    setup(reviewStore([floor(1)]));
    start();
    expect(prompt()).toBe(floor(1).prompt);
    type(floor(1).answer);
    expect(screen.getByTestId("score").textContent).toBe("1");
  });

  it("review mode skips with Enter and saves a review session with the original skills", () => {
    const store = reviewStore([floor(1)]);
    setup(store);
    start();
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(screen.getByTestId("skipped").textContent).toContain(floor(1).prompt);
    advance(30_000);

    const saved = loadHistory(store).at(-1);
    expect(saved?.mode).toBe("review");
    expect(saved?.log[0]?.problem).toEqual(floor(1));
    expect(saved?.log[0]?.outcome).toBe("skipped");
  });

  it("play again with nothing left to review returns to the config", () => {
    // The skipped problem's session is the oldest of a full history, so
    // saving the review session drops it.
    const clean: SessionRecord = { ...skippedSession([]), log: [] };
    const history = [skippedSession([floor(1)]), ...Array.from({ length: 199 }, () => clean)];
    const store = memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ mode: "review", durationS: 30 }),
      [HISTORY_KEY]: JSON.stringify(history),
    });
    setup(store);
    start();
    type(floor(1).answer);
    advance(30_000);
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.getByRole("alert").textContent).toContain("Nada para revisar ainda");
  });

  it("review count includes the session just played", () => {
    const store = memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ mode: "division", division: FLOOR, durationS: 30 }),
    });
    setup(store);
    start();
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    advance(30_000);
    fireEvent.click(screen.getByRole("button", { name: "Configurar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Revisar" }));
    expect(screen.getByTestId("review-count").textContent).toBe("1 questão para revisar");
  });
});

describe("estimation mode", () => {
  const ONLY_OVERFLOW: EstimationSettings = { kinds: ["overflow"] };
  const store = () =>
    memoryStore({
      [SETTINGS_KEY]: JSON.stringify({
        mode: "estimation",
        estimation: ONLY_OVERFLOW,
        durationS: 30,
      }),
    });
  const nth = (i: number) => estimation.generate(deriveSeed(SEED, i), ONLY_OVERFLOW);

  it("estimation mode lists its kinds", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Estimativa" }));
    for (const name of [/^Complexidade/, /^Ordem de grandeza/, /^Overflow/]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(true);
    }
  });

  it("estimation settings are remembered", () => {
    const saved = memoryStore();
    setup(saved);
    fireEvent.click(screen.getByRole("radio", { name: "Estimativa" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Overflow/ }));
    start();
    expect(loadSettings(saved).estimation.kinds).toEqual(["complexity", "magnitude"]);
  });

  it("estimation mode shows numbered options without an equals sign", () => {
    setup(store());
    start();
    expect(prompt()).toBe(nth(0).prompt);
    const options = within(screen.getByRole("list", { name: "Opções" })).getAllByRole("listitem");
    expect(options.map((o) => o.textContent)).toEqual(["1) int32", "2) int64", "3) nenhum"]);
    expect(screen.queryByText("=")).toBeNull();
    expect(answerBox().getAttribute("inputmode")).toBe("numeric");
  });

  it("estimation mode keeps a wrong digit, accepts the option number and counts the correction", () => {
    setup(store());
    start();
    const wrong = nth(0).answer === "1" ? "2" : "1";
    type(wrong);
    expect(answerBox().value).toBe(wrong);
    expect(screen.getByTestId("score").textContent).toBe("0");
    type("");
    type(nth(0).answer);
    expect(screen.getByTestId("score").textContent).toBe("1");
    advance(30_000);
    const slowest = screen.getByRole("table", { name: "Mais lentas" });
    const row = within(slowest).getAllByRole("row")[1];
    if (row === undefined) throw new Error("no answered row");
    const cells = within(row).getAllByRole("cell");
    expect(cells[1]?.textContent).toBe(answerText(nth(0)));
    expect(cells[3]?.textContent).toBe("1");
  });

  it("estimation mode skips with Enter and shows the option text", () => {
    setup(store());
    start();
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    const first = nth(0);
    const skipped = screen.getByTestId("skipped").textContent;
    expect(skipped).toContain(first.prompt);
    expect(skipped).toContain(`${first.answer}) ${first.choices?.[Number(first.answer) - 1]}`);
  });
});

describe("sums mode", () => {
  const storeWithKinds = (sumsSettings: SumsSettings) =>
    memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ mode: "sums", sums: sumsSettings, durationS: 30 }),
    });
  const nth = (settings: SumsSettings, i: number) => sums.generate(deriveSeed(SEED, i), settings);

  it("sums mode lists its kinds", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Somatórios" }));
    for (const name of [/^Somatório Σ/, /^Laços aninhados/]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(true);
    }
  });

  it("sums settings are remembered", () => {
    const saved = memoryStore();
    setup(saved);
    fireEvent.click(screen.getByRole("radio", { name: "Somatórios" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Laços aninhados/ }));
    start();
    expect(loadSettings(saved).sums.kinds).toEqual(["sum"]);
  });

  it("sums mode accepts an equivalent closed form and skips with Enter", () => {
    const onlySums: SumsSettings = { kinds: ["sum"] };
    setup(storeWithKinds(onlySums));
    start();
    expect(prompt()).toBe(nth(onlySums, 0).prompt);
    expect(screen.getByTestId("prompt").classList.contains("code")).toBe(false);
    type(`2(${nth(onlySums, 0).answer})/2`);
    expect(screen.getByTestId("score").textContent).toBe("1");
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(screen.getByTestId("skipped").textContent).toContain(nth(onlySums, 1).answer);
  });

  it("sums mode shows loop code on several lines", () => {
    const onlyLoops: SumsSettings = { kinds: ["loop"] };
    setup(storeWithKinds(onlyLoops));
    start();
    expect(prompt()).toBe(nth(onlyLoops, 0).prompt);
    expect(prompt()).toContain("\n");
    expect(screen.getByTestId("prompt").classList.contains("code")).toBe(true);
  });
});

describe("primes mode", () => {
  const storeWithLimit = (limit: PrimesSettings["limit"]) =>
    memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ mode: "primes", primes: { limit }, durationS: 30 }),
    });
  const nth = (settings: PrimesSettings, i: number) =>
    primes.generate(deriveSeed(SEED, i), settings);

  it("primes mode offers the limits with 1000 chosen", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: "Primos" }));
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Limite" });
    expect(select.value).toBe("1000");
    expect([...select.options].map((o) => o.value)).toEqual(["100", "1000", "10000", "100000"]);
  });

  it("primes limit is remembered", () => {
    const saved = memoryStore();
    setup(saved);
    fireEvent.click(screen.getByRole("radio", { name: "Primos" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Limite" }), {
      target: { value: "100000" },
    });
    start();
    expect(loadSettings(saved).primes).toEqual({ limit: 100_000 });
  });

  it("primes mode accepts the smallest factor with a numeric keyboard and skips with Enter", () => {
    const settings: PrimesSettings = { limit: 10_000 };
    setup(storeWithLimit(10_000));
    start();
    expect(answerBox().getAttribute("inputmode")).toBe("numeric");
    expect(prompt()).toBe(nth(settings, 0).prompt);
    type(nth(settings, 0).answer);
    expect(screen.getByTestId("score").textContent).toBe("1");
    fireEvent.keyDown(answerBox(), { key: "Enter" });
    expect(screen.getByTestId("skipped").textContent).toContain(
      `${nth(settings, 1).prompt} = ${nth(settings, 1).answer}`,
    );
  });
});
