import { describe, expect, it } from "vitest";
import { memoryStore } from "./history";
import {
  appendTypingResult,
  loadTypingLanguages,
  loadTypingResults,
  MAX_TYPING_RESULTS,
  saveTypingLanguages,
  TYPING_KEY,
  TYPING_SETTINGS_KEY,
  typingSummary,
  type TypingResult,
} from "./typing";

function result(over: Partial<TypingResult> = {}): TypingResult {
  return {
    version: 1,
    snippetId: "cpp-gcd",
    language: "cpp",
    seed: 1,
    wpm: 50,
    accuracy: 0.95,
    errors: 3,
    timeMs: 20_000,
    finishedAt: 0,
    ...over,
  };
}

describe("typing results", () => {
  it("typing results use their own keys", () => {
    expect(TYPING_KEY).toBe("popis.typing");
    expect(TYPING_SETTINGS_KEY).toBe("popis.typing-settings");
  });

  it("typing results start empty and keep what is appended", () => {
    const store = memoryStore();
    expect(loadTypingResults(store)).toEqual([]);
    appendTypingResult(store, result({ wpm: 40 }));
    appendTypingResult(store, result({ wpm: 60, language: "python", snippetId: "py-memo" }));
    expect(loadTypingResults(store).map((r) => r.wpm)).toEqual([40, 60]);
  });

  it("typing results keep only the most recent 200", () => {
    expect(MAX_TYPING_RESULTS).toBe(200);
    const store = memoryStore();
    for (let i = 0; i < 205; i++) appendTypingResult(store, result({ seed: i }));
    const loaded = loadTypingResults(store);
    expect(loaded).toHaveLength(200);
    expect(loaded[0]?.seed).toBe(5);
    expect(loaded.at(-1)?.seed).toBe(204);
  });

  it.each(["not json", "{}", "42", JSON.stringify([{ version: 2 }, null, 3])])(
    "typing results load corrupt data %j as an empty list",
    (raw) => {
      expect(loadTypingResults(memoryStore({ [TYPING_KEY]: raw }))).toEqual([]);
    },
  );

  it("typing results drop invalid entries and keep valid ones", () => {
    const good = result();
    const raw = JSON.stringify([good, { ...good, wpm: "fast" }, { ...good, language: "go" }]);
    expect(loadTypingResults(memoryStore({ [TYPING_KEY]: raw }))).toEqual([good]);
  });

  it("typing results survive a store that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadTypingResults(broken)).toEqual([]);
    expect(() => {
      appendTypingResult(broken, result());
    }).not.toThrow();
  });
});

describe("typing languages", () => {
  it("typing languages default to both and round-trip", () => {
    const store = memoryStore();
    expect(loadTypingLanguages(store)).toEqual(["cpp", "python"]);
    saveTypingLanguages(store, ["python"]);
    expect(loadTypingLanguages(store)).toEqual(["python"]);
  });

  it.each(["[]", '["go"]', '"cpp"', "not json", '["cpp","cpp"]'])(
    "typing languages fall back to both for %j",
    (raw) => {
      const loaded = loadTypingLanguages(memoryStore({ [TYPING_SETTINGS_KEY]: raw }));
      expect(loaded).toEqual(raw === '["cpp","cpp"]' ? ["cpp"] : ["cpp", "python"]);
    },
  );
});

describe("typingSummary", () => {
  it("typingSummary gives the best and the mean of the last 10 per language", () => {
    const cpp = [90, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((wpm) => result({ wpm }));
    const summary = typingSummary([...cpp, result({ language: "python", wpm: 33 })]);
    expect(summary.cpp).toEqual({ best: 100, recentMean: 55 });
    expect(summary.python).toEqual({ best: 33, recentMean: 33 });
  });

  it("typingSummary is empty for a language without results", () => {
    expect(typingSummary([]).cpp).toBeNull();
  });
});
