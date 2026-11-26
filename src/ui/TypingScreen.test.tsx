// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import {
  appendTypingResult,
  loadTypingLanguages,
  loadTypingResults,
  type TypingResult,
} from "../storage/typing";
import {
  burstPaceKey,
  codePaceKey,
  loadTypingPace,
  saveConfigTarget,
} from "../storage/typing-pace";
import { generateBurst, generateCodeSnippet } from "../typing/codegen";
import { LANGUAGES, type Snippet } from "../typing/corpus";
import { typeableLength } from "../typing/engine";
import { ghostCodePosition } from "../typing/pace";
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

function advance(ms: number) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

/** Types the snippet line by line with Enter, advancing `stepMs` (or per-line ms) before each key after the first. */
function typeSnippet(snippet: Pick<Snippet, "text">, stepMs: number | readonly number[] = STEP_MS) {
  let first = true;
  const lines = snippet.text.split("\n");
  lines.forEach((line, i) => {
    const dt = typeof stepMs === "number" ? stepMs : (stepMs[i] ?? STEP_MS);
    const key = (press: () => void) => {
      if (!first) clock.advance(dt);
      first = false;
      press();
    };
    for (const ch of line.trimStart()) {
      key(() => fireEvent.change(box(), { target: { value: ch } }));
    }
    if (i < lines.length - 1) key(() => fireEvent.keyDown(box(), { key: "Enter" }));
  });
}

describe("typing screen", () => {
  it("Código types generated code from the seed", () => {
    setup();
    const snippet = generateCodeSnippet(SEED, LANGUAGES);
    expect(snippet.id).toBe(`gen:${snippet.language}:${String(SEED)}`);
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
    expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(SEED, ["cpp"]).id);
    expect(loadTypingLanguages(store)).toEqual(["cpp"]);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "C++" }).disabled).toBe(true);
  });

  it("typing screen starts with the stored languages", () => {
    const store = memoryStore({ "popis.typing-settings": JSON.stringify(["python"]) });
    setup(store);
    expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(SEED, ["python"]).id);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "C++" }).checked).toBe(false);
  });

  it("typing screen marks a wrong key and Backspace fixes it", () => {
    setup();
    const first = generateCodeSnippet(SEED, LANGUAGES).text[0] ?? "";
    typeChars(first === "~" ? "!" : "~");
    expect(charSpans()[0]?.dataset["mark"]).toBe("wrong");
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(charSpans()[0]?.dataset["mark"]).toBe("pending");
    typeChars(first);
    expect(charSpans()[0]?.dataset["mark"]).toBe("correct");
  });

  it("typing screen shows a wrong newline as a visible mark", () => {
    setup();
    const snippet = generateCodeSnippet(SEED, LANGUAGES);
    const firstLine = snippet.text.split("\n")[0] ?? "";
    typeChars(`${firstLine}x`);
    const newline = charSpans()[firstLine.length];
    expect(newline?.dataset["mark"]).toBe("wrong");
    expect(newline?.textContent).toBe("↵\n");
  });

  it("typing screen shows the cursor on the next character", () => {
    setup();
    typeChars(generateCodeSnippet(SEED, LANGUAGES).text[0] ?? "");
    expect(code().querySelectorAll(".cursor")).toHaveLength(1);
    expect(charSpans()[1]?.classList.contains("cursor")).toBe(true);
  });

  it("typing screen indents new lines on Enter", () => {
    setup();
    const snippet = generateCodeSnippet(SEED, LANGUAGES);
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
      const snippet = generateCodeSnippet(SEED, LANGUAGES);
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
        snippetId: `gen:${snippet.language}:${String(SEED)}`,
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
    "Jogar de novo after the results picks a new snippet",
    () => {
      setup(memoryStore(), [SEED, 77]);
      typeSnippet(generateCodeSnippet(SEED, LANGUAGES));
      fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
      expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(77, LANGUAGES).id);
      expect(screen.queryByTestId("wpm")).toBeNull();
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it("Escape exits the round and resets the generated snippet", () => {
    setup(memoryStore(), [SEED, 77]);
    typeChars("x");
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(SEED, LANGUAGES).id);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("Ctrl+Enter generates another snippet", () => {
    setup(memoryStore(), [SEED, 77]);
    typeChars("x");
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(77, LANGUAGES).id);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("typing screen checks a language again", () => {
    const { store } = setup(memoryStore(), [SEED, 8, 9]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Python" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Python" }));
    expect(loadTypingLanguages(store)).toEqual(["cpp", "python"]);
    expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(9, LANGUAGES).id);
  });

  it("typing screen types a dead key's character when the composition ends", () => {
    setup();
    const first = generateCodeSnippet(SEED, LANGUAGES).text[0] ?? "";
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

  it("Cmd+Enter also skips to another snippet", () => {
    setup(memoryStore(), [SEED, 77]);
    typeChars("x");
    fireEvent.keyDown(box(), { key: "Enter", metaKey: true });
    expect(code().getAttribute("data-snippet-id")).toBe(generateCodeSnippet(77, LANGUAGES).id);
    expect(charSpans().every((s) => s.dataset["mark"] === "pending")).toBe(true);
  });

  it("Voltar calls onBack", () => {
    const { onBack } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it(
    "old corpus results still load",
    () => {
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
      expect(summary.textContent).toContain("Últimas 10 rodadas");
      expect(summary.textContent).toContain("melhor 80 WPM");
      expect(summary.textContent).toContain("média 65 WPM");

      const snippet = generateCodeSnippet(SEED, LANGUAGES);
      typeSnippet(snippet);
      const saved = loadTypingResults(store);
      expect(saved.map((r) => r.snippetId)).toEqual(["cpp-gcd", "cpp-gcd", snippet.id]);

      fireEvent.click(screen.getByRole("checkbox", { name: "C++" }));
      if (snippet.language === "cpp") {
        expect(screen.getByTestId("typing-summary").textContent).toBe(
          "Nenhuma rodada nesta configuração. Enter começa a primeira.",
        );
      }
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it("ghost caret advances with the fake clock at the target pace", () => {
    setup();
    const snippet = generateCodeSnippet(SEED, LANGUAGES);
    expect(code().querySelectorAll('[data-ghost="true"]')).toHaveLength(0);

    typeChars(snippet.text[0] ?? "");
    expect(charSpans()[0]?.dataset["ghost"]).toBe("true");

    advance(2000);
    const expected = ghostCodePosition(snippet.text, 2000, 30);
    expect(expected).toBeGreaterThan(0);
    expect(code().querySelectorAll('[data-ghost="true"]')).toHaveLength(1);
    expect(charSpans()[expected]?.dataset["ghost"]).toBe("true");
  });

  it("pace goal select explains that a higher goal means an easier target", () => {
    setup();
    const select = screen.getByRole("combobox", { name: "Meta no ritmo" });
    const id = select.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(id)?.textContent).toBe(
      "% das linhas certas acima do alvo; maior = alvo mais fácil",
    );
  });

  it("ghost caret is hidden when Ritmo-alvo is off", () => {
    const { store } = setup();
    const toggle = screen.getByRole<HTMLInputElement>("checkbox", { name: "Ritmo-alvo" });
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(loadTypingPace(store).enabled).toBe(false);

    const snippet = generateCodeSnippet(SEED, LANGUAGES);
    typeChars(snippet.text[0] ?? "");
    advance(2000);
    expect(code().querySelectorAll('[data-ghost="true"]')).toHaveLength(0);
  });

  it(
    "result shows on-pace share and the next target",
    () => {
      const { store } = setup();
      fireEvent.change(screen.getByRole("combobox", { name: "Meta no ritmo" }), {
        target: { value: "0.8" },
      });
      expect(loadTypingPace(store).goal).toBe(0.8);

      const snippet = generateCodeSnippet(SEED, LANGUAGES);
      typeSnippet(snippet);

      const paceText = screen.getByTestId("typing-pace-result").textContent ?? "";
      expect(paceText).toContain("100% das linhas certas no ritmo");
      // Typed far above 30 WPM: the target catches up in one round (T52).
      const next = Number(/30 → (\d+) WPM/.exec(paceText)?.[1]);
      expect(next).toBeGreaterThan(40);
      expect(loadTypingPace(store).targets[codePaceKey(LANGUAGES)]).toBe(next);

      const events = loadEvents(store).filter((e) => e.drill === "typing.code");
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.extra["target"] === 30 && e.extra["onPace"] === true)).toBe(
        true,
      );
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it(
    "initial target uses prior round history when no target is stored",
    () => {
      const store = memoryStore();
      appendTypingResult(store, {
        version: 1,
        snippetId: "cpp-gcd",
        language: "cpp",
        seed: 1,
        wpm: 50,
        accuracy: 1,
        errors: 0,
        timeMs: 1000,
        finishedAt: 0,
      });
      setup(store);
      expect(screen.getByTestId("pace-target").textContent).toBe("50 WPM");

      typeSnippet(generateCodeSnippet(SEED, LANGUAGES));
      expect(screen.getByTestId("typing-pace-result").textContent).toContain("50 → 52 WPM");
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it(
    "burst result shows the time of each repetition",
    () => {
      const { store } = setup(memoryStore(), [SEED, 77]);
      const toggle = screen.getByRole<HTMLInputElement>("checkbox", { name: "Rajada (5×)" });
      expect(toggle.checked).toBe(false);
      fireEvent.click(toggle);
      expect(toggle.checked).toBe(true);

      const burst = generateBurst(77, LANGUAGES);
      expect(code().getAttribute("data-snippet-id")).toBe(burst.id);
      expect(code().textContent).toBe(burst.text);

      const len = burst.idiom.length;
      const steps = [200, 180, 150, 120, 100] as const;
      typeSnippet(burst, steps);

      const expectedMs = [
        len * steps[0],
        (len + 1) * steps[1],
        (len + 1) * steps[2],
        (len + 1) * steps[3],
        len * steps[4],
      ];
      const reps = screen.getAllByTestId("burst-rep");
      expect(reps).toHaveLength(5);
      expectedMs.forEach((ms, i) => {
        expect(reps[i]?.textContent).toContain(seconds(ms));
      });
      expect(screen.getByTestId("burst-ratio").textContent).toContain("0,50×");

      const events = loadEvents(store).filter((e) => e.drill === "typing.code");
      expect(events).toHaveLength(5);
      expect(events.every((e) => e.kc === `typing.idiom.${burst.rule}`)).toBe(true);
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it(
    "burst result shows a dash when the first repetition takes zero ms",
    () => {
      setup(memoryStore(), [SEED, 77]);
      fireEvent.click(screen.getByRole("checkbox", { name: "Rajada (5×)" }));
      typeSnippet(generateBurst(77, LANGUAGES), 0);
      expect(screen.getByTestId("burst-ratio").textContent).toContain("—");
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );

  it(
    "burst keeps its own pace target",
    () => {
      const store = memoryStore();
      saveConfigTarget(store, codePaceKey(LANGUAGES), 60);
      setup(store, [SEED, 77]);

      expect(screen.getByTestId("pace-target").textContent).toBe("60 WPM");

      fireEvent.click(screen.getByRole("checkbox", { name: "Rajada (5×)" }));
      expect(screen.getByTestId("pace-target").textContent).toBe("30 WPM");

      const burst = generateBurst(77, LANGUAGES);
      typeChars(burst.text[0] ?? "");
      advance(1000);
      expect(code().querySelectorAll('[data-ghost="true"]')).toHaveLength(1);
      fireEvent.keyDown(box(), { key: "Escape" });

      typeSnippet(burst, 100);
      expect(screen.getByTestId("typing-pace-result").textContent).toContain("30 → 32 WPM");
      expect(loadTypingPace(store).targets[burstPaceKey(LANGUAGES)]).toBe(32);
      expect(loadTypingPace(store).targets[codePaceKey(LANGUAGES)]).toBe(60);

      fireEvent.click(screen.getByRole("checkbox", { name: "Rajada (5×)" }));
      expect(screen.getByTestId("pace-target").textContent).toBe("60 WPM");
    },
    WHOLE_SNIPPET_TIMEOUT_MS,
  );
});
