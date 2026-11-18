// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { memoryStore, type KeyValueStore } from "../storage/history";
import {
  appendTypingResult,
  loadTypingLanguages,
  loadTypingResults,
  type TypingResult,
} from "../storage/typing";
import { LANGUAGES, pickSnippet, type Snippet } from "../typing/corpus";
import { typeableLength } from "../typing/engine";
import { seconds } from "./format";
import { TypingScreen } from "./TypingScreen";

const SEED = 5;
const STEP_MS = 100;
/**
 * Typing a whole snippet is ~300 keys, each a React render in jsdom
 * (≥ 5 ms apiece), so these tests need more than the 5 s default.
 */
const WHOLE_SNIPPET_TIMEOUT_MS = 20_000;

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
  render(<TypingScreen clock={clock} store={store} newSeed={newSeed} onBack={onBack} />);
  return { store, onBack };
}

function box(): HTMLTextAreaElement {
  return screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Código digitado" });
}

function code(): HTMLElement {
  return screen.getByTestId("typing-code");
}

function charSpans(): HTMLElement[] {
  return [...code().querySelectorAll<HTMLElement>("span[data-mark]")];
}

function typeChars(text: string) {
  for (const ch of text) fireEvent.change(box(), { target: { value: ch } });
}

/** Types the snippet line by line with Enter, one key every STEP_MS. */
function typeSnippet(snippet: Snippet) {
  let first = true;
  const key = (press: () => void) => {
    if (!first) clock.advance(STEP_MS);
    first = false;
    press();
  };
  const lines = snippet.text.split("\n");
  lines.forEach((line, i) => {
    for (const ch of line.trimStart()) {
      key(() => fireEvent.change(box(), { target: { value: ch } }));
    }
    if (i < lines.length - 1) key(() => fireEvent.keyDown(box(), { key: "Enter" }));
  });
}

describe("typing screen", () => {
  it("typing screen shows a snippet of both languages with everything pending", () => {
    setup();
    const snippet = pickSnippet(SEED, LANGUAGES);
    expect(code().getAttribute("data-snippet-id")).toBe(snippet.id);
    expect(code().textContent).toBe(snippet.text);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
    expect(document.activeElement).toBe(box());
    expect(box().getAttribute("autocapitalize")).toBe("off");
    expect(box().getAttribute("spellcheck")).toBe("false");
  });

  it("typing screen picks from the checked languages and remembers them", () => {
    const { store } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Python" }));
    expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(SEED, ["cpp"]).id);
    expect(loadTypingLanguages(store)).toEqual(["cpp"]);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "C++" }).disabled).toBe(true);
  });

  it("typing screen starts with the stored languages", () => {
    const store = memoryStore({ "popis.typing-settings": JSON.stringify(["python"]) });
    setup(store);
    expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(SEED, ["python"]).id);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "C++" }).checked).toBe(false);
  });

  it("typing screen marks a wrong key and Backspace fixes it", () => {
    setup();
    const first = pickSnippet(SEED, LANGUAGES).text[0] ?? "";
    typeChars(first === "~" ? "!" : "~");
    expect(charSpans()[0]?.dataset["mark"]).toBe("wrong");
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(charSpans()[0]?.dataset["mark"]).toBe("pending");
    typeChars(first);
    expect(charSpans()[0]?.dataset["mark"]).toBe("correct");
  });

  it("typing screen shows a wrong newline as a visible mark", () => {
    setup();
    const snippet = pickSnippet(SEED, LANGUAGES);
    const firstLine = snippet.text.split("\n")[0] ?? "";
    typeChars(`${firstLine}x`);
    const newline = charSpans()[firstLine.length];
    expect(newline?.dataset["mark"]).toBe("wrong");
    expect(newline?.textContent).toBe("↵\n");
  });

  it("typing screen shows the cursor on the next character", () => {
    setup();
    typeChars(pickSnippet(SEED, LANGUAGES).text[0] ?? "");
    expect(code().querySelectorAll(".cursor")).toHaveLength(1);
    expect(charSpans()[1]?.classList.contains("cursor")).toBe(true);
  });

  it("typing screen indents new lines on Enter", () => {
    setup();
    const snippet = pickSnippet(SEED, LANGUAGES);
    const [line1 = "", line2 = ""] = snippet.text.split("\n");
    typeChars(line1);
    fireEvent.keyDown(box(), { key: "Enter" });
    const indent = /^ */.exec(line2)?.[0].length ?? 0;
    const marks = charSpans().map((s) => s.dataset["mark"]);
    expect(marks.slice(0, line1.length + 1 + indent).every((m) => m === "correct")).toBe(true);
    expect(marks[line1.length + 1 + indent]).toBe("pending");
  });

  it("Tab does nothing and keeps the focus", () => {
    setup();
    const tab = fireEvent.keyDown(box(), { key: "Tab" });
    expect(tab).toBe(false);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it(
    "typing the whole snippet shows the results and saves them",
    () => {
      const { store } = setup();
      const snippet = pickSnippet(SEED, LANGUAGES);
      typeSnippet(snippet);

      const typeable = typeableLength(snippet.text);
      const timeMs = (typeable - 1) * STEP_MS;
      const wpm = typeable / 5 / (timeMs / 60_000);
      expect(screen.getByTestId("wpm").textContent).toBe(String(Math.round(wpm)));
      expect(screen.getByTestId("accuracy").textContent).toBe("100%");
      expect(screen.getByTestId("errors").textContent).toBe("0");
      expect(screen.getByTestId("time").textContent).toBe(seconds(timeMs));
      expect(screen.getByTestId("snippet-id").textContent).toBe(snippet.id);
      expect(screen.getByTestId("typing-seed").textContent).toBe(String(SEED));

      const saved = loadTypingResults(store);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        version: 1,
        snippetId: snippet.id,
        language: snippet.language,
        seed: SEED,
        errors: 0,
        accuracy: 1,
        timeMs,
      });
      expect(saved[0]?.wpm).toBeCloseTo(wpm, 10);
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it(
    "Próximo after the results picks a new snippet",
    () => {
      setup(memoryStore(), [SEED, 77]);
      typeSnippet(pickSnippet(SEED, LANGUAGES));
      fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
      expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(77, LANGUAGES).id);
      expect(screen.queryByTestId("wpm")).toBeNull();
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it("Escape picks another snippet", () => {
    setup(memoryStore(), [SEED, 77]);
    typeChars("x");
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(77, LANGUAGES).id);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("Ctrl+Enter restarts the same snippet", () => {
    setup(memoryStore(), [SEED, 77]);
    typeChars("x");
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(SEED, LANGUAGES).id);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("typing screen checks a language again", () => {
    const { store } = setup(memoryStore(), [SEED, 8, 9]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Python" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Python" }));
    expect(loadTypingLanguages(store)).toEqual(["cpp", "python"]);
    expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(9, LANGUAGES).id);
  });

  it("typing screen types a dead key's character when the composition ends", () => {
    setup();
    const first = pickSnippet(SEED, LANGUAGES).text[0] ?? "";
    fireEvent.input(box(), { target: { value: first }, isComposing: true });
    expect(charSpans()[0]?.dataset["mark"]).toBe("pending");
    fireEvent.compositionEnd(box(), { target: { value: first } });
    expect(charSpans()[0]?.dataset["mark"]).toBe("correct");
    expect(box().value).toBe("");
  });

  it("typing screen focuses the hidden box when the code is clicked", () => {
    setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Python" }));
    screen.getByRole("checkbox", { name: "C++" }).focus();
    fireEvent.click(code());
    expect(document.activeElement).toBe(box());
  });

  it("Backspace at the start does nothing", () => {
    setup();
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("Cmd+Enter also restarts the same snippet", () => {
    setup(memoryStore(), [SEED, 77]);
    typeChars("x");
    fireEvent.keyDown(box(), { key: "Enter", metaKey: true });
    expect(code().getAttribute("data-snippet-id")).toBe(pickSnippet(SEED, LANGUAGES).id);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("Voltar calls onBack", () => {
    const { onBack } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("typing summary shows the best and the mean of the last 10 per language", () => {
    const store = memoryStore();
    const base: TypingResult = {
      version: 1,
      snippetId: "cpp-gcd",
      language: "cpp",
      seed: 1,
      wpm: 0,
      accuracy: 1,
      errors: 0,
      timeMs: 1000,
      finishedAt: 0,
    };
    for (const wpm of [80.4, 49.6]) appendTypingResult(store, { ...base, wpm });
    setup(store);
    const summary = screen.getByTestId("typing-summary");
    expect(within(summary).getByTestId("summary-cpp").textContent).toBe(
      "C++: melhor 80 WPM · média dos últimos 10: 65 WPM",
    );
    expect(within(summary).getByTestId("summary-python").textContent).toBe(
      "Python: sem resultados",
    );
  });
});
