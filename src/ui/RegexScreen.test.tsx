// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manualClock, type ManualClock } from "../core/clock";
import { generateRegexItem } from "../regex/drill";
import { REGEX_ROUND_LENGTH } from "../regex/round";
import { loadEvents } from "../storage/events";
import { memoryStore, type KeyValueStore } from "../storage/history";
import { loadRegexResults, loadRegexSettings, REGEX_KEY } from "../storage/regex";
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
        fireEvent.keyDown(box, { key: "Enter" });
      } else if (item.kind === "trocar") {
        const box = regexInput();
        const replBox = screen.getByRole<HTMLInputElement>("textbox", { name: "Substituição" });
        fireEvent.change(box, { target: { value: item.canonical } });
        fireEvent.change(replBox, { target: { value: item.canonicalReplacement } });
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
});
