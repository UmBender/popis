// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
import { mainCommand } from "../stats/derive";
import { loadAllEvents, loadEvents } from "../storage/events";
import { memoryStore, SETTINGS_KEY, type KeyValueStore } from "../storage/history";
import { TEXT_TYPING_SETTINGS_KEY } from "../storage/text-typing";
import { VIM_EDIT_SETTINGS_KEY, VIM_SETTINGS_KEY } from "../storage/vim";
import { pickSnippet, LANGUAGES } from "../typing/corpus";
import {
  DEFAULT_TEXT_SETTINGS,
  initialWords,
  textConfigKey,
  type TextSettings,
} from "../typing/text";
import { generateEdit } from "../vim/drills/edit";
import { generateTarget } from "../vim/drills/target";
import { parseKeys } from "../vim/keys";
import { App } from "./App";
import { TextTypingScreen } from "./TextTypingScreen";
import { TypingScreen } from "./TypingScreen";
import { VimScreen } from "./VimScreen";

// AC-1 and AC-5: every finished round leaves one event per item.

const SEED = 21;
const ONE_PLUS_ONE: ArithmeticSettings = {
  ...DEFAULT_ARITHMETIC,
  operations: ["add"],
  addLeft: { min: 1, max: 1 },
  addRight: { min: 1, max: 1 },
};

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock(1_000_000);
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

const EVENT_KEYS: Record<string, string> = {
  "<CR>": "Enter",
  "<Esc>": "Escape",
  "<BS>": "Backspace",
};

function pressVim(keys: string) {
  const box = screen.getByRole("textbox", { name: "Teclas do Vim" });
  for (const key of parseKeys(keys)) fireEvent.keyDown(box, { key: EVENT_KEYS[key] ?? key });
}

function skipVim() {
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Teclas do Vim" }), {
    key: "Enter",
    ctrlKey: true,
  });
}

describe("training log", () => {
  it("a finished calc session leaves its events", () => {
    const store = memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ arithmetic: ONE_PLUS_ONE, durationS: 30 }),
    });
    render(<App clock={clock} store={store} newSeed={() => SEED} />);
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Resposta" }), { target: { value: "2" } });

    advance(31_000);

    const events = loadAllEvents(store).filter((e) => e.drill === "calc");
    expect(events.map((e) => [e.config, e.ok, e.extra["outcome"]])).toEqual([
      ["arithmetic", true, "correct"],
      ["arithmetic", false, "timeout"],
    ]);
    expect(events[0]?.kc).toBe("arithmetic.add");
    expect(loadEvents(store)).toEqual([]);
  });

  it("a finished vim motion round records one event per target", () => {
    const store: KeyValueStore = memoryStore({
      [VIM_SETTINGS_KEY]: JSON.stringify({ level: 1, durationS: 30 }),
    });
    render(<VimScreen clock={clock} store={store} newSeed={() => SEED} onBack={vi.fn()} />);
    const first = generateTarget(SEED, 0, 1);
    pressVim(first.solution);
    skipVim();

    advance(31_000);

    const events = loadEvents(store).filter((e) => e.drill === "vim.motion");
    expect(events.map((e) => [e.config, e.kc, e.ok, e.extra["i"]])).toEqual([
      ["L1", mainCommand(first.solution), true, 0],
      ["L1", mainCommand(generateTarget(SEED, 1, 1).solution), false, 1],
    ]);
    expect(events[0]?.extra).toMatchObject({ sol: first.solution, min: first.minimum });
    expect(events.every((e) => e.at === clock.wallTime())).toBe(true);
  });

  it("a finished vim edit round records one event per edit", () => {
    const store = memoryStore({
      [VIM_EDIT_SETTINGS_KEY]: JSON.stringify({
        drill: "edit",
        durationS: 30,
        kinds: ["delete-line"],
      }),
    });
    render(<VimScreen clock={clock} store={store} newSeed={() => SEED} onBack={vi.fn()} />);
    pressVim(generateEdit(SEED, 0, ["delete-line"]).reference);
    skipVim();

    advance(31_000);

    const events = loadEvents(store).filter((e) => e.drill === "vim.edit");
    expect(events.map((e) => [e.config, e.kc, e.ok, e.extra["i"]])).toEqual([
      ["edit", "delete-line", true, 0],
      ["edit", "delete-line", false, 1],
    ]);
  });

  it("a finished code run records one event per line", { timeout: 20_000 }, () => {
    const store = memoryStore();
    render(<TypingScreen clock={clock} store={store} newSeed={() => 5} onBack={vi.fn()} />);
    const snippet = pickSnippet(5, LANGUAGES);
    const box = screen.getByRole("textbox", { name: "Código digitado" });
    const lines = snippet.text.split("\n");
    lines.forEach((line, i) => {
      for (const ch of line.trimStart()) {
        clock.advance(100);
        fireEvent.change(box, { target: { value: ch } });
      }
      if (i < lines.length - 1) {
        clock.advance(100);
        fireEvent.keyDown(box, { key: "Enter" });
      }
    });

    const events = loadEvents(store).filter((e) => e.drill === "typing.code");
    expect(events).toHaveLength(lines.length);
    expect(events.every((e) => e.kc === "line" && e.config === snippet.language)).toBe(true);
    expect(events.every((e) => e.ok && e.extra["snippet"] === snippet.id)).toBe(true);
    expect(events.map((e) => e.extra["i"])).toEqual(lines.map((_, i) => i));
  });

  it("the app migrates old rounds once when it starts", () => {
    const store = memoryStore({
      "popis.vim": JSON.stringify([
        {
          version: 1,
          level: 2,
          durationS: 60,
          seed: 7,
          reached: 12,
          skipped: 1,
          efficiency: 0.8,
          finishedAt: 1_000_000,
        },
      ]),
    });

    const { unmount } = render(<App clock={clock} store={store} newSeed={() => SEED} />);
    unmount();
    render(<App clock={clock} store={store} newSeed={() => SEED} />);

    expect(loadEvents(store)).toHaveLength(1);
    expect(store.getItem("popis.migrated.v1")).not.toBeNull();
  });

  it("the Dados item offers export and import", () => {
    render(<App clock={clock} store={memoryStore()} newSeed={() => SEED} />);
    // T18 AC-13: export and import moved from the config screen to the Dados item.
    fireEvent.click(screen.getByRole("radio", { name: "Dados" }));

    expect(screen.getByRole("button", { name: "Exportar dados" })).toBeTruthy();
    expect(screen.getByLabelText("Importar dados")).toBeTruthy();
  });

  it("a finished text test records one event per word", () => {
    const settings: TextSettings = { ...DEFAULT_TEXT_SETTINGS, mode: "words", wordCount: 10 };
    const store = memoryStore({ [TEXT_TYPING_SETTINGS_KEY]: JSON.stringify(settings) });
    render(<TextTypingScreen clock={clock} store={store} newSeed={() => 7} onBack={vi.fn()} />);
    const words = initialWords(7, settings);
    const box = screen.getByRole("textbox", { name: "Texto digitado" });
    words.forEach((word, i) => {
      clock.advance(400);
      fireEvent.change(box, { target: { value: i < words.length - 1 ? `${word} ` : word } });
    });

    const events = loadEvents(store).filter((e) => e.drill === "typing.text");
    expect(events).toHaveLength(10);
    expect(events.every((e) => e.kc === "word" && e.config === textConfigKey(settings))).toBe(true);
    expect(events.every((e) => e.ok)).toBe(true);
    expect(events.map((e) => e.extra["w"])).toEqual(words);
  });
});
