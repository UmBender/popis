import { describe, expect, it } from "vitest";
import { memoryStore, type KeyValueStore } from "./history";
import { DEFAULT_TEXT_SETTINGS, type TextSettings } from "../typing/text";
import {
  burstPaceKey,
  codePaceKey,
  DEFAULT_TYPING_PACE,
  loadTypingPace,
  parseTypingPace,
  saveConfigTarget,
  saveTypingPace,
  targetForConfig,
  textPaceKey,
  TYPING_PACE_KEY,
} from "./typing-pace";

describe("typing pace storage", () => {
  it("saves and loads pace settings and targets per config", () => {
    const store = memoryStore();
    const key = textPaceKey(DEFAULT_TEXT_SETTINGS);
    const codeKey = codePaceKey(["python", "cpp"]);

    saveTypingPace(store, {
      version: 1,
      enabled: false,
      goal: 0.9,
      targets: { [key]: 52, [codeKey]: 44 },
    });

    expect(loadTypingPace(store)).toEqual({
      version: 1,
      enabled: false,
      goal: 0.9,
      targets: { [key]: 52, [codeKey]: 44 },
    });
    expect(codeKey).toBe("code:cpp+python");
    expect(codePaceKey(["cpp", "python"])).toBe(codeKey);
  });

  it("burstPaceKey separates burst pace targets from code pace targets", () => {
    const burstKey = burstPaceKey(["python", "cpp"]);
    expect(burstKey).toBe("burst:cpp+python");
    expect(burstPaceKey(["cpp", "python"])).toBe(burstKey);
    expect(burstKey).not.toBe(codePaceKey(["cpp", "python"]));

    const store = memoryStore();
    saveConfigTarget(store, codePaceKey(["cpp"]), 46);
    saveConfigTarget(store, burstPaceKey(["cpp"]), 68);
    expect(loadTypingPace(store).targets).toEqual({
      "code:cpp": 46,
      "burst:cpp": 68,
    });
  });

  it("corrupt data loads as empty history with defaults", () => {
    expect(loadTypingPace(memoryStore())).toEqual(DEFAULT_TYPING_PACE);
    expect(loadTypingPace(memoryStore({ [TYPING_PACE_KEY]: "{not json" }))).toEqual(
      DEFAULT_TYPING_PACE,
    );
    expect(loadTypingPace(memoryStore({ [TYPING_PACE_KEY]: "[]" }))).toEqual(DEFAULT_TYPING_PACE);
    expect(parseTypingPace(null)).toEqual(DEFAULT_TYPING_PACE);
    expect(parseTypingPace({ version: 2, enabled: false, goal: 0.8, targets: { a: 50 } })).toEqual(
      DEFAULT_TYPING_PACE,
    );
    expect(
      parseTypingPace({
        version: 1,
        enabled: "yes",
        goal: 0.5,
        targets: { good: 42, zero: 0, nan: Number.NaN, bad: "50" },
      }),
    ).toEqual({
      version: 1,
      enabled: true,
      goal: 0.85,
      targets: { good: 42 },
    });
    expect(parseTypingPace({ version: 1, enabled: true, goal: 0.85, targets: "bad" })).toEqual(
      DEFAULT_TYPING_PACE,
    );
  });

  it("resolves initial target from recent history or 30 WPM", () => {
    const key = textPaceKey({ ...DEFAULT_TEXT_SETTINGS, source: "quote" } satisfies TextSettings);
    expect(targetForConfig(DEFAULT_TYPING_PACE, key, [])).toBe(30);
    expect(targetForConfig(DEFAULT_TYPING_PACE, key, [40, 50, 60])).toBe(50);

    const store = memoryStore();
    const updated = saveConfigTarget(store, key, 54);
    expect(targetForConfig(updated, key, [40, 50, 60])).toBe(54);
    expect(loadTypingPace(store).targets[key]).toBe(54);
  });

  it("ignores storage write errors without throwing", () => {
    const failing: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveTypingPace(failing, DEFAULT_TYPING_PACE);
    }).not.toThrow();
  });
});
