// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../../core/clock";
import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../../gen/arithmetic";
import { division, type DivisionSettings } from "../../gen/division";
import {
  HISTORY_KEY,
  memoryStore,
  SETTINGS_KEY,
  type KeyValueStore,
  type SessionRecord,
} from "../../storage/history";
import { App } from "../App";
import { Reference } from "./panel";
import { DEFAULT_PREFS, loadPrefs, SHELL_KEY } from "./prefs";
import { ITEMS } from "./sections";
import { isField } from "./Shell";

// T18: the editor window around every screen.

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

function setup(store: KeyValueStore = memoryStore(), narrow = false) {
  const view = render(<App clock={clock} store={store} newSeed={() => SEED} narrow={narrow} />);
  return { store, view };
}

function onePlusOne(durationS = 120): KeyValueStore {
  return memoryStore({
    [SETTINGS_KEY]: JSON.stringify({ arithmetic: ONE_PLUS_ONE, durationS }),
  });
}

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

const key = (k: string, target: Element = document.body, extra: object = {}) => {
  fireEvent.keyDown(target, { key: k, ...extra });
};
const radio = (name: string) => screen.getByRole<HTMLInputElement>("radio", { name });
const checkedItem = () =>
  screen
    .getAllByRole<HTMLInputElement>("radio")
    .find((r) => r.checked)
    ?.getAttribute("aria-label");
const path = () => screen.getByTestId("shell-path").textContent;
const status = () => screen.getByTestId("shell-status").textContent ?? "";
const menuButton = () => screen.getByRole("button", { name: "Menu" });
const start = () => {
  fireEvent.click(screen.getByRole("button", { name: "Começar" }));
};
const answer = (text: string) => {
  fireEvent.change(screen.getByRole("textbox", { name: "Resposta" }), {
    target: { value: text },
  });
};

/** A finished round with `score` right answers. */
function round(score: number, finishedAt: number): SessionRecord {
  return {
    version: 1,
    mode: "arithmetic",
    finishedAt,
    durationMs: 120_000,
    seed: 1,
    params: DEFAULT_ARITHMETIC,
    log: Array.from({ length: score }, () => ({
      problem: { skill: "arithmetic.add", prompt: "1 + 1", answer: "2", seed: 1, params: null },
      outcome: "correct" as const,
      timeMs: 1000,
      corrections: 0,
    })),
  };
}

function reviewStore(): KeyValueStore {
  const params: DivisionSettings = { kinds: ["floor"] };
  const problems = [1, 2, 3].map((seed) => division.generate(seed, params));
  const record: SessionRecord = {
    version: 1,
    mode: "division",
    finishedAt: 0,
    durationMs: 30_000,
    seed: 1,
    params,
    log: problems.map((problem) => ({ problem, outcome: "skipped", timeMs: 1000, corrections: 0 })),
  };
  return memoryStore({ [HISTORY_KEY]: JSON.stringify([record]) });
}

describe("shell window", () => {
  it("the path bar shows popis, the folder and the item", () => {
    setup();
    expect(path()).toBe("popis/cálculo/aritmética");
    fireEvent.click(radio("Primos"));
    expect(path()).toBe("popis/cp/primos");
  });

  it("the path bar holds the brand on the menu", () => {
    setup();
    const bar = screen.getByTestId("shell-bar");
    expect(within(bar).getByTestId("brand-acronym")).toBeTruthy();
  });

  it("the tree is a radio group of folders with the active item checked", () => {
    setup();
    const tree = screen.getByRole("radiogroup", { name: "Treinos" });
    expect(within(tree).getByRole("button", { name: /Cálculo/ })).toBeTruthy();
    expect(radio("Aritmética").checked).toBe(true);
    expect(within(tree).getAllByRole("radio")).toHaveLength(ITEMS.length);
  });

  it("each tree item shows its shortcut beside it", () => {
    setup();
    expect(radio("Fatoração").closest("label")?.textContent).toContain("3");
    expect(radio("Revisar").closest("label")?.textContent).toContain("8");
  });

  it("the Revisar item shows how many questions there are to review", () => {
    setup(reviewStore());
    expect(screen.getByTestId("tree-review-count").textContent).toBe("3");
  });

  it("the status line shows NORMAL and the shortcuts as segments without dots", () => {
    setup();
    expect(status()).toContain("NORMAL");
    expect(status()).toContain("j/k mover");
    expect(status()).toContain("Enter começar");
    expect(status()).toContain("? atalhos");
    expect(status()).not.toContain("·");
  });

  it("the game hides the tree and the status line says JOGANDO", () => {
    setup();
    start();
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    expect(status()).toContain("JOGANDO");
    expect(status()).toContain("Esc sair");
    expect(path()).toBe("popis/cálculo/aritmética");
  });

  it("the results path ends in resultado and the status line says RESULTADO", () => {
    setup(onePlusOne(30));
    start();
    advance(31_000);
    expect(path()).toBe("popis/cálculo/aritmética/resultado");
    expect(status()).toContain("RESULTADO");
    expect(status()).toContain("r revisar erros");
  });

  it("text typing hides the tree while a round runs", () => {
    setup();
    fireEvent.click(radio("Texto"));
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Texto digitado" }), {
      target: { value: "a" },
    });
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
  });
});

describe("shell keyboard", () => {
  it("j and k move through the items", () => {
    setup();
    key("j");
    expect(checkedItem()).toBe("Álgebra");
    key("k");
    expect(checkedItem()).toBe("Aritmética");
  });

  it("the arrow keys move like j and k", () => {
    setup();
    key("ArrowDown");
    key("ArrowDown");
    expect(checkedItem()).toBe("Fatoração");
    key("ArrowUp");
    expect(checkedItem()).toBe("Álgebra");
  });

  it("a digit jumps to the item with that shortcut", () => {
    setup();
    key("7");
    expect(checkedItem()).toBe("Primos");
  });

  it("h closes the folder of the item and l opens it", () => {
    setup();
    key("h");
    expect(screen.queryByRole("radio", { name: "Álgebra" })).toBeNull();
    key("l");
    expect(radio("Álgebra")).toBeTruthy();
  });

  it("j skips the items of a closed folder", () => {
    setup();
    key("4");
    key("h");
    key("j");
    expect(checkedItem()).toBe("Divisão inteira");
  });

  it("closed folders are saved", () => {
    const { store, view } = setup();
    fireEvent.click(screen.getByRole("button", { name: /CP/ }));
    expect(screen.queryByRole("radio", { name: "Primos" })).toBeNull();
    view.unmount();
    setup(store);
    expect(screen.queryByRole("radio", { name: "Primos" })).toBeNull();
  });

  it("j, j and Enter start the third item", () => {
    setup();
    key("j");
    key("j");
    key("Enter");
    expect(screen.getByTestId("prompt")).toBeTruthy();
    expect(path()).toBe("popis/cálculo/fatoração");
  });

  it("keys typed in a text field are not captured", () => {
    setup();
    const field = screen.getByRole("spinbutton", { name: "Adição: mínimo à esquerda" });
    key("j", field);
    key("m", field);
    expect(checkedItem()).toBe("Aritmética");
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
  });

  it("the menu keys are not captured during a game", () => {
    setup();
    start();
    key("7");
    expect(screen.getByTestId("prompt")).toBeTruthy();
  });

  it("? opens the shortcuts help and Esc closes it", () => {
    setup();
    key("?");
    const help = screen.getByRole("dialog", { name: "Atalhos" });
    expect(help.textContent).toContain("j/k");
    key("Escape");
    expect(screen.queryByRole("dialog", { name: "Atalhos" })).toBeNull();
  });

  it("Esc on a screen item goes back to the last mode", () => {
    setup();
    key("3");
    fireEvent.click(radio("Dados"));
    key("Escape");
    expect(checkedItem()).toBe("Fatoração");
  });

  it("Esc on the results goes back to the menu", () => {
    setup(onePlusOne(30));
    start();
    advance(31_000);
    key("Escape");
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
  });

  it("r on the results opens Revisar", () => {
    setup(onePlusOne(30));
    start();
    advance(31_000);
    key("r");
    expect(checkedItem()).toBe("Revisar");
  });

  it("Enter on the results page plays again", () => {
    setup(onePlusOne(30));
    start();
    advance(31_000);
    key("Enter");
    expect(screen.getByTestId("prompt")).toBeTruthy();
  });
});

describe("collapsible menu", () => {
  it("☰ collapses and opens the tree on desktop and controls it", () => {
    setup();
    const button = menuButton();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(button.getAttribute("aria-controls") ?? "")).not.toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole("radiogroup", { name: "Treinos" })).toBeTruthy();
  });

  it("m collapses the tree and the state is saved", () => {
    const { store, view } = setup();
    key("m");
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    view.unmount();
    setup(store);
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("the narrow drawer is closed at first and opens as a modal dialog", () => {
    setup(memoryStore(), true);
    expect(screen.queryByRole("radiogroup", { name: "Treinos" })).toBeNull();
    fireEvent.click(menuButton());
    const drawer = screen.getByRole("dialog", { name: "Treinos" });
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    expect(drawer.contains(document.activeElement)).toBe(true);
  });

  it("choosing an item closes the drawer and focus returns to ☰", () => {
    setup(memoryStore(), true);
    fireEvent.click(menuButton());
    fireEvent.click(radio("Primos"));
    expect(screen.queryByRole("dialog", { name: "Treinos" })).toBeNull();
    expect(path()).toBe("popis/cp/primos");
    expect(document.activeElement).toBe(menuButton());
  });

  it("choosing the item already chosen still closes the drawer", () => {
    setup(memoryStore(), true);
    fireEvent.click(menuButton());
    fireEvent.click(radio("Aritmética"));
    expect(screen.queryByRole("dialog", { name: "Treinos" })).toBeNull();
  });

  it("Esc closes the drawer and focus returns to ☰", () => {
    setup(memoryStore(), true);
    fireEvent.click(menuButton());
    key("Escape", document.activeElement ?? document.body);
    expect(screen.queryByRole("dialog", { name: "Treinos" })).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it("a tap outside the drawer closes it", () => {
    setup(memoryStore(), true);
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByTestId("shell-backdrop"));
    expect(screen.queryByRole("dialog", { name: "Treinos" })).toBeNull();
  });

  it("☰ again closes the drawer", () => {
    setup(memoryStore(), true);
    fireEvent.click(menuButton());
    fireEvent.click(menuButton());
    expect(screen.queryByRole("dialog", { name: "Treinos" })).toBeNull();
  });

  it("Tab inside the open drawer stays inside it", () => {
    setup(memoryStore(), true);
    fireEvent.click(menuButton());
    const drawer = screen.getByRole("dialog", { name: "Treinos" });
    const stops = within(drawer).getAllByRole("button");
    const last = stops.at(-1);
    if (last === undefined) throw new Error("no button in the drawer");
    last.focus();
    key("Tab", last);
    expect(drawer.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(last);
    const first = stops[0];
    if (first === undefined) throw new Error("no button in the drawer");
    first.focus();
    key("Tab", first, { shiftKey: true });
    expect(drawer.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(first);
  });
});

const ORDER = ["title", "options", "area", "history", "reference"];

describe("panel order", () => {
  for (const item of ITEMS) {
    it(`the ${item.label} panel keeps title, options, area, history, reference`, () => {
      setup();
      fireEvent.click(radio(item.label));
      const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-panel]")).map(
        (el) => el.dataset["panel"] ?? "",
      );
      expect(blocks[0]).toBe("title");
      expect(blocks).toContain("options");
      const ranks = blocks.map((b) => ORDER.indexOf(b));
      expect(ranks.every((r) => r >= 0)).toBe(true);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      for (const ref of document.querySelectorAll<HTMLDetailsElement>("[data-panel=reference]")) {
        expect(ref.tagName).toBe("DETAILS");
        expect(ref.open).toBe(false);
      }
    });
  }

  it("a reference panel opened stays open after a reload and can be closed", () => {
    const { store, view } = setup();
    fireEvent.click(radio("Movimento"));
    const ref = document.querySelector<HTMLDetailsElement>("[data-panel=reference]");
    if (ref === null) throw new Error("no reference panel");
    ref.open = true;
    fireEvent(ref, new Event("toggle"));
    view.unmount();
    setup(store);
    fireEvent.click(radio("Movimento"));
    const reopened = document.querySelector<HTMLDetailsElement>("[data-panel=reference]");
    expect(reopened?.open).toBe(true);
    if (reopened === null) throw new Error("no reference panel");
    reopened.open = false;
    fireEvent(reopened, new Event("toggle"));
    expect(reopened.open).toBe(false);
  });

  it("the mode panel shows the title, the one-line description and Começar with Enter", () => {
    setup();
    const title = document.querySelector("[data-panel=title]");
    expect(title?.textContent).toContain("Aritmética");
    expect(title?.textContent).toContain("Responda o máximo de contas");
    expect(screen.getByRole("button", { name: "Começar" }).textContent).toContain("Enter");
  });

  it("the mode panel shows the last 10 rounds with the best and the mean", () => {
    const scores = [1, 2, 30, 40, 10, 20, 30, 40, 50, 60, 70, 80];
    const store = memoryStore({
      [HISTORY_KEY]: JSON.stringify(scores.map((s, i) => round(s, i))),
    });
    setup(store);
    const history = screen.getByTestId("mode-history");
    expect(history.textContent).toContain("Últimas 10 rodadas");
    // The last ten scores, 30 40 10 20 … 80, on eight bar heights.
    expect(screen.getByTestId("mode-spark").textContent).toBe("▃▄▁▂▃▄▅▆▇█");
    expect(history.textContent).toContain("melhor 80");
    expect(history.textContent).toContain("média 43");
  });

  it("an empty history invites the first round", () => {
    setup();
    expect(screen.getByTestId("mode-history").textContent).toBe(
      "Nenhuma rodada nesta configuração. Enter começa a primeira.",
    );
  });
});

describe("verdicts in the game", () => {
  it("the game shows a submissions queue that does not take the focus", () => {
    setup(onePlusOne());
    start();
    const box = screen.getByRole("textbox", { name: "Resposta" });
    answer("2");
    answer("3");
    answer("");
    answer("2");
    const queue = screen.getByRole("list", { name: "Submissões" });
    const marks = within(queue).getAllByRole("listitem");
    expect(marks.map((m) => m.textContent)).toEqual(["AC", "WA", "AC"]);
    expect(marks.at(-1)?.className).toContain("now");
    expect(marks[0]?.className).not.toContain("now");
    expect(document.activeElement).toBe(box);
  });

  it("the prompt is the largest text of the game", () => {
    setup(onePlusOne());
    start();
    expect(screen.getByTestId("prompt").className).toContain("prompt");
  });
});

describe("results scoreboard", () => {
  it("results show the solved count, the pairs and the ICPC scoreboard", () => {
    setup(onePlusOne(30));
    start();
    answer("2");
    answer("3");
    answer("");
    answer("2");
    advance(31_000);
    expect(screen.getByTestId("results-solved").textContent).toBe("2 resolvidas em 30 s");
    const pairs = screen.getByTestId("results-pairs").textContent ?? "";
    expect(pairs).toContain("tentativas erradas1");
    expect(pairs).toContain("puladas0");
    expect(pairs).toContain("seu recorde2");
    const table = screen.getByRole("table", { name: "Placar da rodada" });
    const cells = within(table)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(cells[0]).toBe("Adição");
    expect(cells[1]).toMatch(/^\+\d/);
    expect(cells[2]).toMatch(/^\+1\d/);
    expect(screen.getByTestId("results-seed").textContent).toContain(String(SEED));
    expect(screen.getByRole("button", { name: "Jogar de novo" }).textContent).toContain("Enter");
  });

  it("the record counts the earlier rounds of the same configuration", () => {
    const store = memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ arithmetic: ONE_PLUS_ONE, durationS: 30 }),
      [HISTORY_KEY]: JSON.stringify([{ ...round(9, 0), params: ONE_PLUS_ONE, durationMs: 30_000 }]),
    });
    setup(store);
    start();
    answer("2");
    advance(31_000);
    expect(screen.getByTestId("results-pairs").textContent).toContain("seu recorde9");
  });
});

describe("Dados and tokens", () => {
  it("the Dados item holds the export and import", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Exportar dados" })).toBeNull();
    fireEvent.click(radio("Dados"));
    expect(screen.getByRole("button", { name: "Exportar dados" })).toBeTruthy();
    expect(path()).toBe("popis/treino/dados");
  });

  it("app.css defines the text, space and rail tokens of Shell", () => {
    // From the project root: under jsdom, import.meta.url is not a file URL.
    const css = readFileSync("src/ui/app.css", "utf8");
    for (const token of [
      "--text-sm: 0.8125rem",
      "--text-md: 1rem",
      "--text-lg: 1.25rem",
      "--text-xl: 2rem",
      "--text-xxl: 4.5rem",
      "--space-1: 0.25rem",
      "--space-2: 0.5rem",
      "--space-3: 1rem",
      "--space-4: 1.5rem",
      "--space-5: 3rem",
      "--rail: 26ch",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).not.toMatch(/box-shadow|gradient\(|border-radius:\s*[1-9]/);
  });
});

describe("shell edge cases", () => {
  it("j and k move focus along with the selection when a tree radio has focus", () => {
    setup();
    const first = radio("Aritmética");
    first.focus();
    key("j", first);
    expect(checkedItem()).toBe("Álgebra");
    expect(document.activeElement).toBe(radio("Álgebra"));
  });

  it("the shortcuts help closes with its button and ignores other keys", () => {
    setup();
    key("?");
    const dialog = screen.getByRole("dialog", { name: "Atalhos" });
    key("a", dialog);
    expect(screen.getByRole("dialog", { name: "Atalhos" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: /Fechar/ }));
    expect(screen.queryByRole("dialog", { name: "Atalhos" })).toBeNull();
  });

  it("Enter on a non-mode item focuses its area instead of starting a mode", () => {
    setup();
    fireEvent.click(radio("Texto"));
    key("Enter");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Texto digitado" }));
  });

  it("unrelated keys on the results screen keep the results visible", () => {
    setup(onePlusOne(30));
    start();
    advance(31_000);
    key("a");
    expect(screen.getByTestId("results-solved")).toBeTruthy();
  });

  it("useMedia listens to matchMedia changes when narrow is not forced", () => {
    const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
    let matches = false;
    const listeners = new Set<() => void>();
    const removed = vi.fn();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        get matches() {
          return matches;
        },
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => {
          removed();
          listeners.delete(fn);
        },
      }),
    });
    try {
      const view = render(<App clock={clock} store={memoryStore()} newSeed={() => SEED} />);
      matches = true;
      act(() => {
        for (const fn of listeners) fn();
      });
      fireEvent.click(menuButton());
      expect(screen.getByRole("dialog", { name: "Treinos" })).toBeTruthy();
      view.unmount();
      expect(removed).toHaveBeenCalled();
    } finally {
      if (original !== undefined) Object.defineProperty(window, "matchMedia", original);
      else Reflect.deleteProperty(window, "matchMedia");
    }
  });

  it("loadPrefs and standalone Reference handle fallback values", () => {
    const store = memoryStore({
      [SHELL_KEY]: JSON.stringify({ item: "unknown", closed: "bad", open: 42 }),
    });
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS);
    expect(isField(null)).toBe(false);
    render(
      <Reference id="orphan" title="Orphan">
        body
      </Reference>,
    );
    const group = screen.getByRole<HTMLDetailsElement>("group", { name: "Orphan" });
    group.open = true;
    fireEvent(group, new Event("toggle"));
    expect(group.open).toBe(true);
  });

  it("shell ignores unmapped keys, Escape on modes, Enter on empty Revisar and keys in selects", () => {
    const store = memoryStore({
      [HISTORY_KEY]: JSON.stringify([
        { ...round(1, 0), params: null, durationMs: 120_000 },
        { ...round(2, 1), params: [], durationMs: 120_000 },
      ]),
    });
    setup(store);
    key("k");
    expect(checkedItem()).toBe("Treino do dia");
    key("k");
    key("j", document.body, { ctrlKey: true });
    expect(checkedItem()).toBe("Treino do dia");
    key("j");
    expect(checkedItem()).toBe("Aritmética");
    key("Escape");
    key("a");
    menuButton().focus();
    key("Enter", menuButton());
    expect(screen.queryByRole("textbox", { name: "Resposta" })).toBeNull();
    const duration = screen.getByRole("combobox", { name: "Duração" });
    duration.focus();
    key("j", duration);
    expect(checkedItem()).toBe("Aritmética");
    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", { value: true });
    document.body.appendChild(editable);
    key("j", editable);
    editable.remove();
    expect(checkedItem()).toBe("Aritmética");
    fireEvent.click(radio("Revisar"));
    key("Enter");
    expect(screen.queryByRole("textbox", { name: "Resposta" })).toBeNull();
  });
});
