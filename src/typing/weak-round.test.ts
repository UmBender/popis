import { describe, expect, it } from "vitest";
import { traceText, type KeyTrace } from "../stats/keytrace";
import type { WeakTarget } from "../stats/weak";
import { targetIntervalMs } from "./pace";
import {
  currentWeakTarget,
  finishWeakBlock,
  shouldGraduate,
  startWeakRound,
  summarizeWeakRound,
  WEAK_BLOCK_MS,
  WEAK_BLOCK_SECONDS,
  WEAK_BLOCKS_PER_ROUND,
  WEAK_GRADUATION_ACCURACY,
  weakEvents,
} from "./weak-round";
import { pressSpace, startWords, typeWordsText } from "./words-engine";

const TARGETS: readonly WeakTarget[] = [
  { ngram: "qu", kind: "slow", beforeMedianMs: 320, errorRate: null, symbol: false },
  { ngram: "->", kind: "slow", beforeMedianMs: 290, errorRate: null, symbol: true },
  { ngram: "[i", kind: "slow", beforeMedianMs: 260, errorRate: null, symbol: true },
  { ngram: "th", kind: "slow", beforeMedianMs: 240, errorRate: null, symbol: false },
  { ngram: ";", kind: "error", beforeMedianMs: 250, errorRate: 0.4, symbol: true },
  { ngram: "q", kind: "error", beforeMedianMs: null, errorRate: 0.3, symbol: false },
];

describe("weak-round", () => {
  it("an n-gram graduates under the target interval at 95% accuracy", () => {
    // At 60 WPM, targetIntervalMs = 60000 / (5 * 60) = 200 ms
    expect(targetIntervalMs(60)).toBe(200);
    expect(WEAK_BLOCK_SECONDS).toBe(30);
    expect(WEAK_BLOCK_MS).toBe(30_000);
    expect(WEAK_BLOCKS_PER_ROUND).toBe(5);
    expect(WEAK_GRADUATION_ACCURACY).toBe(0.95);

    expect(shouldGraduate(199, 0.95, 60)).toBe(true);
    expect(shouldGraduate(150, 1.0, 60)).toBe(true);
    expect(shouldGraduate(200, 0.98, 60)).toBe(false);
    expect(shouldGraduate(220, 1.0, 60)).toBe(false);
    expect(shouldGraduate(180, 0.94, 60)).toBe(false);
    expect(shouldGraduate(null, 1.0, 60)).toBe(false);
  });

  it("the next selected n-gram replaces a graduated one", () => {
    let round = startWeakRound(TARGETS, 60);
    expect(currentWeakTarget(round)?.ngram).toBe("qu");

    // Block 1: "qu" is too slow -> stays focused
    round = finishWeakBlock(round, { afterMedianMs: 240, accuracy: 0.98 });
    expect(round.finished).toBe(false);
    expect(round.graduated).toEqual([]);
    expect(currentWeakTarget(round)?.ngram).toBe("qu");

    // Block 2: "qu" beats 200 ms with >= 95% accuracy -> graduates, "->" takes focus
    round = finishWeakBlock(round, { afterMedianMs: 185, accuracy: 0.96 });
    expect(round.finished).toBe(false);
    expect(round.graduated).toEqual(["qu"]);
    expect(currentWeakTarget(round)?.ngram).toBe("->");

    // Block 3: "->" beats 200 ms but accuracy is 90% -> does not graduate
    round = finishWeakBlock(round, { afterMedianMs: 170, accuracy: 0.9 });
    expect(currentWeakTarget(round)?.ngram).toBe("->");
  });

  it("the round ends after 5 blocks", () => {
    let round = startWeakRound(TARGETS, 60);
    const results = [
      { afterMedianMs: 230, accuracy: 0.98 }, // block 1: qu stays
      { afterMedianMs: 180, accuracy: 0.97 }, // block 2: qu graduates
      { afterMedianMs: 190, accuracy: 0.95 }, // block 3: -> graduates
      { afterMedianMs: 210, accuracy: 0.99 }, // block 4: [i stays
      { afterMedianMs: 205, accuracy: 0.96 }, // block 5: [i stays -> round ends
    ];
    for (const r of results) {
      expect(round.finished).toBe(false);
      round = finishWeakBlock(round, r);
    }

    expect(round.finished).toBe(true);
    expect(round.blocks).toHaveLength(5);
    expect(currentWeakTarget(round)).toBeNull();
    // Calling finishWeakBlock after finish is a no-op
    expect(finishWeakBlock(round, { afterMedianMs: 100, accuracy: 1 })).toBe(round);

    expect(summarizeWeakRound(round)).toEqual([
      { ngram: "qu", beforeMedianMs: 320, afterMedianMs: 180, blocks: 2, graduated: true },
      { ngram: "->", beforeMedianMs: 290, afterMedianMs: 190, blocks: 1, graduated: true },
      { ngram: "[i", beforeMedianMs: 260, afterMedianMs: 205, blocks: 2, graduated: false },
    ]);
  });

  it("finishes early when all targets graduate, handles null afterMedianMs, and emits typing.weak events", () => {
    expect(() => startWeakRound([], 60)).toThrow(RangeError);

    let single = startWeakRound([TARGETS[0] as WeakTarget], 60);
    single = finishWeakBlock(single, { afterMedianMs: 240, accuracy: 0.96 });
    expect(single.finished).toBe(false);
    single = finishWeakBlock(single, { afterMedianMs: null, accuracy: 0 });
    expect(summarizeWeakRound(single)).toEqual([
      { ngram: "qu", beforeMedianMs: 320, afterMedianMs: 240, blocks: 2, graduated: false },
    ]);
    single = finishWeakBlock(single, { afterMedianMs: 150, accuracy: 0.98 });
    expect(single.finished).toBe(true);
    expect(summarizeWeakRound(single)).toEqual([
      { ngram: "qu", beforeMedianMs: 320, afterMedianMs: 150, blocks: 3, graduated: true },
    ]);

    // weakEvents tags drill = "typing.weak" and kc = "typing.ngram.<ngram>"
    let state = startWords(["quick", "query"], { lenient: false, timeLimitMs: WEAK_BLOCK_MS });
    let trace: KeyTrace = [];
    const step = (fn: (s: typeof state) => typeof state, at: number) => {
      const next = fn(state);
      trace = traceText(trace, state, next, at);
      state = next;
    };
    step((s) => typeWordsText(s, "q", 100), 100);
    step((s) => typeWordsText(s, "u", 200), 200);
    step((s) => typeWordsText(s, "i", 300), 300);
    step((s) => typeWordsText(s, "c", 400), 400);
    step((s) => typeWordsText(s, "k", 500), 500);
    step((s) => pressSpace(s, 600), 600);

    const events = weakEvents(trace, {
      at: 9000,
      seed: 42,
      words: state.words,
      ngram: "qu",
      target: 60,
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.drill).toBe("typing.weak");
    expect(events[0]?.kc).toBe("typing.ngram.qu");
    expect(events[0]?.config).toBe("weak");
    expect(events[0]?.extra["w"]).toBe("quick");
    expect(events[0]?.extra["target"]).toBe(60);
    expect(events[0]?.extra["onPace"]).toBe(true);
  });
});
