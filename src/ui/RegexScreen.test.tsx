// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateRegexItem } from "../regex/drill";
import { REGEX_ROUND_LENGTH } from "../regex/round";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { loadRegexResults, loadRegexSettings, REGEX_KEY } from "../storage/regex";
import { App } from "./App";
import { RegexScreen } from "./RegexScreen";

// T45 AC-5: Regex Prática screen — live highlight per key (rAF debounced),
// Enter accepted only when every line is right, syntax error without crashing,
// skip reveals canonical regex, 5-item results with per-item time & attempts and T22 events.

const SEED = 31;
let clock: ManualClock;

beforeEach(() => {
  vi.useFakeTimers();
  clock = manualClock();
});

afterEach(() => {
  vi.useRealTimers();
});

function flushFrame(ms = 20) {
  act(() => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

function setup(store: KeyValueStore = memoryStore()) {
  const onLearn = vi.fn();
  const onRunning = vi.fn();
  const onBack = vi.fn();
  render(
    <RegexScreen
      drill="practice"
      clock={clock}
      store={store}
      newSeed={() => SEED}
      onBack={onBack}
      onRunning={onRunning}
      onLearn={onLearn}
    />,
  );
  return { store, onLearn, onRunning, onBack };
}

const regexInput = () =>
  screen.getByRole<HTMLInputElement>("textbox", { name: "Expressão regular" });

describe("RegexScreen Practice mode (AC-5)", () => {
  it("live highlight updates on each key", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "python", kinds: ["casar"] }),
    });
    setup(store);

    const item0 = generateRegexItem(SEED, 0, "python", ["casar"]);
    expect(item0.kind).toBe("casar");

    const box = regexInput();
    fireEvent.change(box, { target: { value: "." } });
    flushFrame();
    expect(screen.getAllByTestId("regex-match-span").length).toBeGreaterThan(0);

    fireEvent.change(box, { target: { value: item0.canonical } });
    flushFrame();
    const lines = screen.getAllByTestId("regex-line");
    expect(lines.length).toBeGreaterThanOrEqual(6);
    expect(lines.every((el) => el.textContent?.includes("✓"))).toBe(true);
  });

  it("Enter is accepted only when every line is right", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "python", kinds: ["casar"] }),
    });
    setup(store);

    const item0 = generateRegexItem(SEED, 0, "python", ["casar"]);
    const item1 = generateRegexItem(SEED, 1, "python", ["casar"]);

    const box = regexInput();
    fireEvent.change(box, { target: { value: ".*" } });
    flushFrame();
    fireEvent.keyDown(box, { key: "Enter" });

    // Still on item 1 of 5 with feedback explaining it is not right yet.
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");
    expect(screen.getByTestId("regex-prompt").textContent).toBe(item0.prompt);
    expect(screen.getByTestId("regex-feedback")).toBeTruthy();

    // Now enter the canonical regex -> accepted and advances to item 2 of 5.
    fireEvent.change(box, { target: { value: item0.canonical } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("regex-progress").textContent).toBe("2 / 5");
    expect(screen.getByTestId("regex-prompt").textContent).toBe(item1.prompt);
  });

  it("syntax error is shown without crashing", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "ere", kinds: ["casar"] }),
    });
    setup(store);

    const box = regexInput();
    fireEvent.change(box, { target: { value: "(abc" } });
    flushFrame();
    expect(screen.getByTestId("regex-error").textContent).toMatch(/Parêntese/);

    // Dialect-specific error in grep -E.
    fireEvent.change(box, { target: { value: "\\d+" } });
    flushFrame();
    expect(screen.getByTestId("regex-error").textContent).toMatch(/grep -E/);

    // Pressing Enter while syntax is invalid does not crash or advance.
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");
  });

  it("skip shows the canonical regex", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "python", kinds: ["casar"] }),
    });
    setup(store);

    const item0 = generateRegexItem(SEED, 0, "python", ["casar"]);
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));

    expect(screen.getByTestId("regex-canonical").textContent).toContain(item0.canonical);
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");

    // Clicking Próximo advances to item 2.
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByTestId("regex-progress").textContent).toBe("2 / 5");
  });

  it("completes a 5-item round across all item kinds, shows per-item time and attempts, and records T22 events", () => {
    const store = memoryStore();
    setup(store);

    for (let i = 0; i < REGEX_ROUND_LENGTH; i++) {
      const item = generateRegexItem(SEED, i, "python");
      act(() => {
        clock.advance(2000);
        vi.advanceTimersByTime(2000);
      });

      if (item.kind === "casar" || item.kind === "extrair") {
        const box = regexInput();
        if (i === 0) {
          fireEvent.change(box, { target: { value: "nope-never-matches" } });
          fireEvent.keyDown(box, { key: "Enter" });
        }
        fireEvent.change(box, { target: { value: item.canonical } });
        flushFrame();
        fireEvent.keyDown(box, { key: "Enter" });
      } else if (item.kind === "trocar") {
        const box = regexInput();
        const replBox = screen.getByRole<HTMLInputElement>("textbox", { name: "Substituição" });
        fireEvent.change(box, { target: { value: item.canonical } });
        fireEvent.change(replBox, { target: { value: item.canonicalReplacement } });
        flushFrame();
        fireEvent.keyDown(replBox, { key: "Enter" });
      } else {
        const boxes = screen.getAllByRole<HTMLInputElement>("checkbox", { name: /Linha \d/ });
        item.expected.forEach((shouldMatch, idx) => {
          if (shouldMatch && boxes[idx] !== undefined) fireEvent.click(boxes[idx]);
        });
        fireEvent.click(screen.getByRole("button", { name: "Conferir" }));
      }
    }

    expect(screen.getByTestId("result")).toBeTruthy();
    const table = screen.getByTestId("regex-result-table");
    expect(within(table).getAllByRole("row")).toHaveLength(6); // header + 5 items

    const events = loadEvents(store);
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.drill === "regex.practice")).toBe(true);
    expect(loadRegexResults(store)).toHaveLength(1);
  });

  it("persists dialect changes in popis.regex", () => {
    const store = memoryStore();
    setup(store);

    const select = screen.getByLabelText<HTMLSelectElement>("Dialeto");
    expect(select.value).toBe("python");
    fireEvent.change(select, { target: { value: "ere" } });
    expect(loadRegexSettings(store).dialect).toBe("ere");
  });

  it("supports keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+Enter, Esc), kind toggles, ler/extrair/trocar errors and aprender jump", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "python", kinds: ["casar", "ler", "trocar"] }),
    });
    const { onBack } = setup(store);

    // Toggle a kind checkbox off and persist.
    const kindsBox = screen.getByTestId("regex-kinds-details");
    const lerCheck = within(kindsBox).getByLabelText<HTMLInputElement>("Ler regex");
    fireEvent.click(lerCheck);
    expect(loadRegexSettings(store).kinds).not.toContain("ler");

    // Switch back to only casar to test empty Enter, zero-width highlight, Ctrl+Enter, Ctrl+Shift+Enter, Esc.
    const trocarCheck = within(kindsBox).getByLabelText<HTMLInputElement>("Trocar texto");
    fireEvent.click(trocarCheck);
    const box = regexInput();

    // Empty Enter does nothing.
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");

    // Zero-width match `^` highlights cleanly without crashing.
    fireEvent.change(box, { target: { value: "^" } });
    flushFrame();
    expect(screen.getAllByTestId("regex-match-span").length).toBeGreaterThan(0);

    // Ctrl+Enter skips (reveals canonical + clears stale error), second Ctrl+Enter advances.
    fireEvent.change(box, { target: { value: "(unclosed" } });
    flushFrame();
    expect(screen.getByTestId("regex-error")).toBeTruthy();
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("regex-canonical")).toBeTruthy();
    expect(screen.queryByTestId("regex-error")).toBeNull();
    fireEvent.submit(box.closest("form")!);
    expect(screen.getByTestId("regex-progress").textContent).toBe("2 / 5");

    // Ctrl+Enter twice via keyboard advances directly.
    const box2 = regexInput();
    fireEvent.keyDown(box2, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(box2, { key: "Enter", ctrlKey: true });
    expect(screen.getByTestId("regex-progress").textContent).toBe("3 / 5");

    // Ctrl+Shift+Enter restarts to item 1 / 5.
    fireEvent.keyDown(regexInput(), { key: "Enter", ctrlKey: true, shiftKey: true });
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");

    // Escape exits active round.
    fireEvent.change(regexInput(), { target: { value: "a" } });
    fireEvent.keyDown(regexInput(), { key: "Escape" });
    expect(screen.getByTestId("regex-time").textContent).toBe("0 s");

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("handles ler wrong attempts, skip reveal, trocar replacement errors and results Enter/Escape", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "ere", kinds: ["ler"] }),
    });
    setup(store);

    // Wrong ler submission shows feedback.
    fireEvent.click(screen.getByRole("button", { name: "Conferir" }));
    expect(screen.getByTestId("regex-feedback")).toBeTruthy();

    // Skip all 5 ler items to verify revealed match marks and results keyboard shortcuts.
    for (let i = 0; i < REGEX_ROUND_LENGTH; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Pular" }));
      expect(screen.getByTestId("regex-canonical")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    }
    expect(screen.getByTestId("result")).toBeTruthy();

    // Enter on results starts a new round.
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");

    // Finish again, click Jogar de novo, then finish once more and press Escape on results.
    for (let i = 0; i < REGEX_ROUND_LENGTH; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Pular" }));
      fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");

    for (let i = 0; i < REGEX_ROUND_LENGTH; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Pular" }));
      fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    }
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("regex-progress").textContent).toBe("1 / 5");
  });

  it("jumps from Prática reference panel to the matching Aprender lesson inside App", () => {
    const store = memoryStore({
      [REGEX_KEY]: JSON.stringify({ dialect: "ere", kinds: ["trocar"] }),
    });
    render(<App clock={clock} store={store} newSeed={() => 9} />);

    fireEvent.click(screen.getByRole("radio", { name: "Prática" }));
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/regex/prática");
    expect(screen.getByTestId("regex-mode-badge").textContent).toBe("sed -E");

    // Trigger replacement error in sed -E (\g<1>).
    fireEvent.change(regexInput(), { target: { value: "([0-9]+)" } });
    const repl = screen.getByRole<HTMLInputElement>("textbox", { name: "Substituição" });
    fireEvent.change(repl, { target: { value: "\\g<1>" } });
    flushFrame();
    expect(screen.getByTestId("regex-error").textContent).toMatch(/sed -E/);

    // Click an "aprender" link in Referência rápida -> opens Aprender directly on that lesson.
    const refBtn = screen.getAllByRole("button", { name: "aprender" })[0]!;
    fireEvent.click(refBtn);
    expect(screen.getByTestId("shell-path").textContent).toBe("popis/regex/aprender");
    expect(screen.getByTestId("learn-explanation")).toBeTruthy();
  });
});
