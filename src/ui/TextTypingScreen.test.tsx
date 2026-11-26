// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import {
  appendTextResult,
  loadTextResults,
  loadTextSettings,
  TEXT_TYPING_SETTINGS_KEY,
  type TextResult,
} from "../storage/text-typing";
import { loadTypingPace, textPaceKey } from "../storage/typing-pace";
import { ghostTextPosition } from "../typing/pace";
import { pickQuote } from "../typing/quotes";
import {
  DEFAULT_TEXT_SETTINGS,
  initialWords,
  textConfigKey,
  textConfigLabel,
  type TextSettings,
} from "../typing/text";
import { seconds } from "./format";
import { TextTypingScreen } from "./TextTypingScreen";

const SEED = 5;
const STEP_MS = 400;
const WORDS_10: TextSettings = { ...DEFAULT_TEXT_SETTINGS, mode: "words", wordCount: 10 };

let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(store: KeyValueStore = memoryStore(), seeds: readonly number[] = [SEED]) {
  let next = 0;
  const onBack = vi.fn();
  const newSeed = () => seeds[Math.min(next++, seeds.length - 1)] ?? SEED;
  render(<TextTypingScreen clock={clock} store={store} newSeed={newSeed} onBack={onBack} />);
  return { store, onBack };
}

function storeWith(settings: TextSettings): KeyValueStore {
  return memoryStore({ [TEXT_TYPING_SETTINGS_KEY]: JSON.stringify(settings) });
}

function box(): HTMLTextAreaElement {
  return screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Texto digitado" });
}

function wordEls(): HTMLElement[] {
  return [...screen.getByTestId("text-words").querySelectorAll<HTMLElement>("[data-word]")];
}

function shownWords(): string[] {
  return wordEls().map((w) => w.textContent);
}

function statusOf(i: number): string | undefined {
  return wordEls()[i]?.dataset["status"];
}

function marksOf(i: number): string[] {
  return [...(wordEls()[i]?.querySelectorAll<HTMLElement>("[data-mark]") ?? [])].map(
    (l) => l.dataset["mark"] ?? "",
  );
}

function type(text: string) {
  fireEvent.change(box(), { target: { value: text } });
}

function choose(name: string, value: string) {
  fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });
}

/** Moves both the injected clock and the timers forward. */
function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

/** Types every word, one word per STEP_MS, with a space between words. */
function typeAll(words: readonly string[]) {
  words.forEach((word, i) => {
    if (i > 0) clock.advance(STEP_MS);
    type(i < words.length - 1 ? `${word} ` : word);
  });
}

function stripAccents(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "");
}

function result(over: Partial<TextResult>): TextResult {
  return {
    version: 1,
    config: textConfigKey(DEFAULT_TEXT_SETTINGS),
    seed: 1,
    wpm: 50,
    raw: 50,
    accuracy: 1,
    chars: { correct: 1, incorrect: 0, extra: 0, missed: 0 },
    timeMs: 30_000,
    finishedAt: 0,
    ...over,
  };
}

describe("text typing screen", () => {
  it("text typing screen shows the default text with the first word current", () => {
    setup();
    expect(shownWords()).toEqual(initialWords(SEED, DEFAULT_TEXT_SETTINGS));
    expect(statusOf(0)).toBe("current");
    expect(statusOf(1)).toBe("pending");
    expect(marksOf(0).every((m) => m === "pending")).toBe(true);
    expect(screen.getByTestId("text-progress").textContent).toBe("30 s");
    expect(document.activeElement).toBe(box());
    expect(box().getAttribute("autocapitalize")).toBe("off");
    expect(box().getAttribute("autocorrect")).toBe("off");
    expect(box().getAttribute("autocomplete")).toBe("off");
    expect(box().getAttribute("spellcheck")).toBe("false");
  });

  it("text typing screen shows the options with the default values", () => {
    setup();
    const value = (name: string) => screen.getByRole<HTMLSelectElement>("combobox", { name }).value;
    expect([
      value("Tipo"),
      value("Idioma"),
      value("Lista"),
      value("Modo"),
      value("Tamanho"),
    ]).toEqual(["words", "pt", "200", "time", "30"]);
    for (const name of ["Pontuação", "Números", "Acentos opcionais"]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(false);
    }
  });

  it("text typing screen marks wrong letters and underlines a wrong word", () => {
    setup();
    type("§");
    expect(marksOf(0)[0]).toBe("incorrect");
    type(" ");
    expect(statusOf(0)).toBe("wrong");
    expect(statusOf(1)).toBe("current");
  });

  it("text typing screen marks a right word as correct", () => {
    setup();
    const first = initialWords(SEED, DEFAULT_TEXT_SETTINGS)[0] ?? "";
    type(`${first} `);
    expect(statusOf(0)).toBe("correct");
    expect(marksOf(0).every((m) => m === "correct")).toBe(true);
  });

  it("text typing screen ends a words test and shows the results", () => {
    const { store } = setup(memoryStore(), [SEED, 6, 7]);
    choose("Modo", "words");
    choose("Tamanho", "10");
    const words = initialWords(7, WORDS_10);
    expect(shownWords()).toEqual(words);
    expect(screen.getByTestId("text-progress").textContent).toBe("0/10");
    typeAll(words);

    const chars = words.join("").length;
    const timeMs = 9 * STEP_MS;
    const wpm = (chars + 9) / 5 / (timeMs / 60_000);
    expect(screen.getByTestId("text-wpm").textContent).toBe(String(Math.round(wpm)));
    expect(screen.getByTestId("text-raw").textContent).toBe(String(Math.round(wpm)));
    expect(screen.getByTestId("text-accuracy").textContent).toBe("100%");
    expect(screen.getByTestId("text-chars").textContent).toBe(`${String(chars)}/0/0/0`);
    expect(screen.getByTestId("text-time").textContent).toBe(seconds(timeMs));
    expect(screen.getByTestId("text-config").textContent).toBe(textConfigLabel(WORDS_10));
    expect(screen.getByTestId("text-seed").textContent).toBe("7");
    expect(loadTextResults(store)).toEqual([
      {
        version: 1,
        config: textConfigKey(WORDS_10),
        seed: 7,
        wpm,
        raw: wpm,
        accuracy: 1,
        chars: { correct: chars, incorrect: 0, extra: 0, missed: 0 },
        timeMs,
        finishedAt: timeMs,
      },
    ]);
    const best = String(Math.round(wpm));
    expect(screen.getByTestId("text-summary").textContent).toContain(`melhor ${best} WPM`);
    expect(screen.getByTestId("text-summary").textContent).toContain(`média ${best} WPM`);
  });

  it("text typing screen shows the progress of a words test", () => {
    setup(storeWith(WORDS_10));
    const first = initialWords(SEED, WORDS_10)[0] ?? "";
    type(`${first} `);
    expect(screen.getByTestId("text-progress").textContent).toBe("1/10");
  });

  it("text typing screen counts the time down from the first key and ends a time test", () => {
    const { store } = setup();
    advance(5000);
    expect(screen.getByTestId("text-progress").textContent).toBe("30 s");
    const first = initialWords(SEED, DEFAULT_TEXT_SETTINGS)[0] ?? "";
    type(`${first} `);
    advance(10_000);
    expect(screen.getByTestId("text-progress").textContent).toBe("20 s");
    expect(screen.queryByTestId("text-wpm")).toBeNull();
    advance(20_000);
    expect(screen.getByTestId("text-wpm")).toBeTruthy();
    expect(loadTextResults(store)[0]?.timeMs).toBe(30_000);
    advance(5000);
    expect(loadTextResults(store)).toHaveLength(1);
  });

  it("text typing screen keeps 40 words ahead in a time test", () => {
    setup();
    const words = initialWords(SEED, DEFAULT_TEXT_SETTINGS);
    for (const word of words.slice(0, 3)) type(`${word} `);
    expect(wordEls().length).toBeGreaterThanOrEqual(3 + 40);
    expect(shownWords().slice(0, 40)).toEqual(words);
    expect(statusOf(3)).toBe("current");
  });

  it("Ctrl+Enter draws another text and Escape exits the round", () => {
    setup(memoryStore(), [SEED, 9]);
    type("§");
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(shownWords()).toEqual(initialWords(SEED, DEFAULT_TEXT_SETTINGS));
    expect(marksOf(0).every((m) => m === "pending")).toBe(true);
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(shownWords()).toEqual(initialWords(9, DEFAULT_TEXT_SETTINGS));
  });

  it("Backspace deletes a letter and Ctrl+Backspace the whole word", () => {
    setup();
    type("§§§");
    const typed = () => marksOf(0).filter((m) => m !== "pending").length;
    expect(typed()).toBe(3);
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(typed()).toBe(2);
    fireEvent.keyDown(box(), { key: "Backspace", ctrlKey: true });
    expect(typed()).toBe(0);
  });

  it("Backspace on an empty word goes back to a wrong word", () => {
    setup();
    type("§ ");
    expect(statusOf(1)).toBe("current");
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(statusOf(0)).toBe("current");
  });

  it("Enter is ignored", () => {
    setup();
    expect(fireEvent.keyDown(box(), { key: "Enter" })).toBe(false);
    expect(statusOf(0)).toBe("current");
    expect(marksOf(0).every((m) => m === "pending")).toBe(true);
  });

  it("touch keyboard deletes arrive as Backspace and Ctrl+Backspace", () => {
    setup();
    type("§§§");
    const typed = () => marksOf(0).filter((m) => m !== "pending").length;
    const del = (inputType: string) =>
      fireEvent(
        box(),
        new InputEvent("beforeinput", { inputType, bubbles: true, cancelable: true }),
      );
    expect(del("deleteContentBackward")).toBe(false);
    expect(typed()).toBe(2);
    del("deleteWordBackward");
    expect(typed()).toBe(0);
    expect(del("insertText")).toBe(true);
  });

  it("text typing screen types a dead key's character when the composition ends", () => {
    setup();
    fireEvent.input(box(), { target: { value: "§" }, isComposing: true });
    expect(marksOf(0).every((m) => m === "pending")).toBe(true);
    fireEvent.compositionEnd(box(), { target: { value: "§" } });
    expect(marksOf(0)[0]).toBe("incorrect");
    expect(box().value).toBe("");
  });

  it("text typing screen focuses the hidden box when the words are clicked", () => {
    setup();
    screen.getByRole("checkbox", { name: "Números" }).focus();
    fireEvent.click(screen.getByTestId("text-words"));
    expect(document.activeElement).toBe(box());
  });
});

describe("text typing options", () => {
  it("text typing options are saved and draw a new text", () => {
    const { store } = setup(memoryStore(), [SEED, 6]);
    choose("Idioma", "en");
    const settings = { ...DEFAULT_TEXT_SETTINGS, language: "en" as const };
    expect(loadTextSettings(store)).toEqual(settings);
    expect(shownWords()).toEqual(initialWords(6, settings));
  });

  it("text typing options are loaded from the store", () => {
    const settings: TextSettings = {
      ...DEFAULT_TEXT_SETTINGS,
      language: "en",
      listSize: 1000,
      punctuation: true,
      numbers: true,
      seconds: 60,
    };
    setup(storeWith(settings));
    expect(shownWords()).toEqual(initialWords(SEED, settings));
    expect(screen.getByTestId("text-progress").textContent).toBe("60 s");
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Pontuação" }).checked).toBe(
      true,
    );
  });

  it("text typing options toggle each checkbox and list size", () => {
    const { store } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pontuação" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Números" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Acentos opcionais" }));
    choose("Lista", "1000");
    choose("Tamanho", "120");
    expect(loadTextSettings(store)).toEqual({
      ...DEFAULT_TEXT_SETTINGS,
      punctuation: true,
      numbers: true,
      lenientAccents: true,
      listSize: 1000,
      seconds: 120,
    });
  });

  it("text typing options offer the sizes of the chosen mode", () => {
    setup();
    const sizes = () =>
      [...screen.getByRole("combobox", { name: "Tamanho" }).querySelectorAll("option")].map(
        (o) => o.textContent,
      );
    expect(sizes()).toEqual(["15 s", "30 s", "60 s", "120 s"]);
    choose("Modo", "words");
    expect(sizes()).toEqual(["10", "25", "50", "100"]);
  });

  it("quote source shows a quote and disables the word options", () => {
    const { store } = setup(memoryStore(), [SEED, 6]);
    choose("Tipo", "quote");
    const words = pickQuote(6, "pt").text.split(" ");
    expect(shownWords()).toEqual(words);
    expect(screen.getByTestId("text-progress").textContent).toBe(`0/${String(words.length)}`);
    for (const name of ["Lista", "Modo", "Tamanho"]) {
      expect(screen.getByRole<HTMLSelectElement>("combobox", { name }).disabled).toBe(true);
    }
    for (const name of ["Pontuação", "Números"]) {
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name }).disabled).toBe(true);
    }
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: "Acentos opcionais" }).disabled,
    ).toBe(false);
    expect(loadTextSettings(store).source).toBe("quote");
  });

  it("accents optional accept words typed without diacritics", () => {
    setup(storeWith({ ...DEFAULT_TEXT_SETTINGS, lenientAccents: true }));
    const words = initialWords(SEED, DEFAULT_TEXT_SETTINGS);
    for (const word of words.slice(0, 5)) type(`${stripAccents(word)} `);
    expect([0, 1, 2, 3, 4].map(statusOf)).toEqual(Array(5).fill("correct"));
  });
});

describe("text typing results", () => {
  it("text typing summary shows the best and the mean of the current config", () => {
    const store = memoryStore();
    for (const wpm of [80, 60]) appendTextResult(store, result({ wpm }));
    appendTextResult(store, result({ wpm: 200, config: "other" }));
    setup(store);
    expect(screen.getByTestId("text-summary").textContent).toContain("melhor 80 WPM");
    expect(screen.getByTestId("text-summary").textContent).toContain("média 70 WPM");
  });

  it("text typing summary says when the config has no results", () => {
    setup(memoryStore({ "popis.text-typing": "corrupt" }));
    expect(screen.getByTestId("text-summary").textContent).toBe(
      "Nenhuma rodada nesta configuração. Enter começa a primeira.",
    );
  });

  it("Jogar de novo draws another text and Voltar goes back", () => {
    const { onBack } = setup(storeWith(WORDS_10), [SEED, 8]);
    typeAll(initialWords(SEED, WORDS_10));
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.queryByTestId("text-wpm")).toBeNull();
    expect(shownWords()).toEqual(initialWords(8, WORDS_10));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("text typing results count a wrong word ended by space", () => {
    const { store } = setup(storeWith({ ...DEFAULT_TEXT_SETTINGS, source: "quote" }));
    const words = pickQuote(SEED, "pt").text.split(" ");
    typeAll([...words.slice(0, -1), "§ "]);
    expect(screen.getByTestId("text-wpm")).toBeTruthy();
    const last = words.at(-1) ?? "";
    expect(loadTextResults(store)[0]?.chars.missed).toBe(Math.max(0, last.length - 1));
  });

  it("ghost caret advances with the fake clock at the target pace", () => {
    setup(storeWith(WORDS_10));
    const words = initialWords(SEED, WORDS_10);
    const area = screen.getByTestId("text-words");
    expect(area.querySelectorAll('[data-ghost="true"]')).toHaveLength(0);

    type(words[0]?.[0] ?? "a");
    expect(area.querySelectorAll('[data-ghost="true"]')).toHaveLength(1);

    advance(2000);
    const expected = ghostTextPosition(words, 2000, 30);
    expect(expected).not.toBeNull();
    expect(area.querySelectorAll('[data-ghost="true"]')).toHaveLength(1);
    const targetWord = wordEls()[expected?.word ?? 0];
    const wordLetters = [...(targetWord?.querySelectorAll<HTMLElement>("[data-mark]") ?? [])];
    if ((expected?.letter ?? 0) === wordLetters.length) {
      expect(targetWord?.dataset["ghost"]).toBe("true");
    } else {
      expect(wordLetters[expected?.letter ?? 0]?.dataset["ghost"]).toBe("true");
    }
  });

  it("pace goal select explains that a higher goal means an easier target", () => {
    setup(storeWith(WORDS_10));
    const select = screen.getByRole("combobox", { name: "Meta no ritmo" });
    const id = select.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(id)?.textContent).toBe(
      "% das palavras certas acima do alvo; maior = alvo mais fácil",
    );
  });

  it("ghost caret is hidden when Ritmo-alvo is off", () => {
    const { store } = setup(storeWith(WORDS_10));
    const toggle = screen.getByRole<HTMLInputElement>("checkbox", { name: "Ritmo-alvo" });
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(loadTypingPace(store).enabled).toBe(false);

    const words = initialWords(SEED, WORDS_10);
    type(words[0]?.[0] ?? "a");
    advance(2000);
    expect(screen.getByTestId("text-words").querySelectorAll('[data-ghost="true"]')).toHaveLength(
      0,
    );
  });

  it("result shows on-pace share and the next target", () => {
    const { store } = setup(storeWith(WORDS_10));
    fireEvent.change(screen.getByRole("combobox", { name: "Meta no ritmo" }), {
      target: { value: "0.8" },
    });
    expect(loadTypingPace(store).goal).toBe(0.8);

    const words = initialWords(SEED, WORDS_10);
    typeAll(words);

    const paceText = screen.getByTestId("text-pace-result").textContent ?? "";
    expect(paceText).toContain("100% das palavras certas no ritmo");
    // Typed far above 30 WPM: the target catches up in one round (T52).
    const next = Number(/30 → (\d+) WPM/.exec(paceText)?.[1]);
    expect(next).toBeGreaterThan(40);
    expect(loadTypingPace(store).targets[textPaceKey(WORDS_10)]).toBe(next);

    const events = loadEvents(store).filter((e) => e.drill === "typing.text");
    expect(events).toHaveLength(10);
    expect(events.every((e) => e.extra["target"] === 30 && e.extra["onPace"] === true)).toBe(true);
  });

  it("initial target uses prior round history when no target is stored", () => {
    const store = storeWith(WORDS_10);
    appendTextResult(store, result({ config: textConfigKey(WORDS_10), wpm: 50 }));
    setup(store);
    expect(screen.getByTestId("pace-target").textContent).toBe("50 WPM");

    typeAll(initialWords(SEED, WORDS_10));
    expect(screen.getByTestId("text-pace-result").textContent).toContain("50 → 52 WPM");
  });
});
