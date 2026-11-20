import { describe, expect, it } from "vitest";
import { createRng, deriveSeed, type Rng } from "../core/rng";
import type { JsonValue } from "../core/problem";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { DEFAULT_FACTORING, factoring } from "../gen/factoring";
import { editEvents, motionEvents } from "../stats/derive";
import type { TrainingEvent } from "../stats/event";
import { codeEvents, textEvents, type KeyTrace } from "../stats/keytrace";
import { DAY_MS } from "../stats/summary";
import type { EditResult } from "../vim/edit-round";
import type { TargetResult } from "../vim/round";
import { loadDaily } from "./daily";
import { loadAllEvents, loadEvents, recordEvents } from "./events";
import { appendSession, loadHistory, type KeyValueStore, type SessionRecord } from "./history";
import { appendTextResult } from "./text-typing";
import { appendTypingResult } from "./typing";
import { appendVimEditResult, appendVimResult } from "./vim";

const START = Date.UTC(2026, 0, 1);
const SOLUTIONS = ["3fx;", "w", "2dw", "/foo<CR>", "ci(", "$", "5j", "}"];

/** A store of strings that can say how much it holds, in characters. */
function sizedStore(): KeyValueStore & { size(): number } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    size: () => [...data].reduce((sum, [k, v]) => sum + k.length + v.length, 0),
  };
}

function calcSession(rng: Rng, finishedAt: number): SessionRecord {
  const factored = rng.next() < 0.3;
  const seed = rng.int(0, 0xffffffff);
  const count = rng.int(55, 80);
  const params: JsonValue = factored ? DEFAULT_FACTORING : DEFAULT_ARITHMETIC;
  const log = Array.from({ length: count }, (_, i) => {
    const s = deriveSeed(seed, i);
    return {
      problem: factored
        ? factoring.generate(s, DEFAULT_FACTORING)
        : arithmetic.generate(s, DEFAULT_ARITHMETIC),
      outcome: rng.next() < 0.9 ? ("correct" as const) : ("skipped" as const),
      timeMs: rng.int(900, 9000),
      corrections: rng.int(0, 2),
    };
  });
  return {
    version: 1,
    mode: factored ? "factoring" : "arithmetic",
    finishedAt,
    durationMs: 300_000,
    seed,
    params,
    log,
  };
}

/** A typing trace: every unit's characters, with the odd mistake. */
function trace(rng: Rng, units: readonly string[], ending: string): KeyTrace {
  const stamps: KeyTrace[number][] = [];
  let at = 0;
  units.forEach((unit, index) => {
    for (const ch of unit + ending) {
      at += rng.int(70, 260);
      if (rng.next() < 0.04) {
        stamps.push({ at, unit: index, expected: ch, typed: "x", ok: false });
        at += rng.int(70, 260);
      }
      stamps.push({ at, unit: index, expected: ch, typed: ch, ok: true });
    }
  });
  return stamps;
}

function typingEvents(rng: Rng, at: number): TrainingEvent[] {
  const lines = Array.from({ length: rng.int(5, 12) }, () => "x".repeat(rng.int(10, 40)));
  const words = Array.from({ length: 60 }, () => "palavra".slice(0, rng.int(2, 8)));
  return [
    ...codeEvents(trace(rng, lines, "\n"), {
      at,
      config: "cpp",
      seed: rng.int(0, 0xffffffff),
      snippetId: "cpp-12",
    }),
    ...textEvents(trace(rng, words, " "), {
      at: at + 1,
      config: "pt-60",
      seed: rng.int(0, 0xffffffff),
      words,
    }),
  ];
}

function vimEvents(rng: Rng, at: number): TrainingEvent[] {
  const targets: TargetResult[] = Array.from({ length: 9 }, (_, index) => ({
    index,
    seed: rng.int(0, 0xffffffff),
    snippetId: "cpp-7",
    keys: rng.int(2, 9),
    minimum: rng.int(1, 4),
    solution: rng.pick(SOLUTIONS),
    timeMs: rng.int(1500, 9000),
    skipped: rng.next() < 0.1,
  }));
  const edits: EditResult[] = Array.from({ length: 9 }, (_, index) => ({
    index,
    seed: rng.int(0, 0xffffffff),
    kind: "change-word" as const,
    snippetId: "py-4",
    keys: rng.int(2, 9),
    referenceKeys: rng.int(1, 4),
    reference: rng.pick(SOLUTIONS),
    timeMs: rng.int(1500, 9000),
    skipped: rng.next() < 0.1,
  }));
  return [
    ...motionEvents({ config: { level: 3, durationMs: 60_000, seed: 1 }, results: targets }, at),
    ...editEvents({ results: edits }, at + 1),
  ];
}

describe("storage size", () => {
  it("a year of daily practice stays under 3 MB", { timeout: 120_000 }, () => {
    const store = sizedStore();
    const rng = createRng(2026);
    let produced = 0;
    let largest = 0;

    for (let day = 0; day < 365; day++) {
      const evening = START + day * DAY_MS + 20 * 3_600_000;
      for (let s = 0; s < 3; s++) {
        const record = calcSession(rng, evening + s * 360_000);
        produced += record.log.length;
        appendSession(store, record);
      }
      const events = [
        ...vimEvents(rng, evening + 1_200_000),
        ...typingEvents(rng, evening + 1_500_000),
        ...vimEvents(rng, evening + 1_800_000),
        ...typingEvents(rng, evening + 2_100_000),
      ];
      produced += events.length;
      recordEvents(store, events, evening + 2_400_000);
      for (let r = 0; r < 3; r++) {
        appendVimResult(store, {
          version: 1,
          level: 3,
          durationS: 60,
          seed: rng.int(0, 0xffffffff),
          reached: 9,
          skipped: 1,
          efficiency: 0.73,
          finishedAt: evening + r,
        });
        appendVimEditResult(store, {
          version: 1,
          kind: "edit",
          durationS: 60,
          seed: rng.int(0, 0xffffffff),
          reached: 9,
          skipped: 1,
          efficiency: 0.9,
          finishedAt: evening + r,
        });
        appendTypingResult(store, {
          version: 1,
          snippetId: "cpp-12",
          language: "cpp",
          seed: rng.int(0, 0xffffffff),
          wpm: 41.123456,
          accuracy: 0.956,
          errors: 4,
          timeMs: 52_000,
          finishedAt: evening + r,
        });
        appendTextResult(store, {
          version: 1,
          config: "pt-60",
          seed: rng.int(0, 0xffffffff),
          wpm: 55.5,
          raw: 61.2,
          accuracy: 0.95,
          chars: { correct: 280, incorrect: 8, extra: 1, missed: 2 },
          timeMs: 60_000,
          finishedAt: evening + r,
        });
      }
      largest = Math.max(largest, store.size());
    }

    expect(largest).toBeLessThan(3_000_000);
    expect(store.size()).toBeLessThan(3_000_000);
    // Nothing was lost: daily rows, raw events and sessions cover every event.
    const rows = loadDaily(store).reduce((sum, r) => sum + r.n, 0);
    const recorded = loadEvents(store).length;
    const inHistory = loadHistory(store).reduce((sum, s) => sum + s.log.length, 0);
    expect(rows + recorded + inHistory).toBe(produced);
    expect(loadAllEvents(store)).toHaveLength(recorded + inHistory);
  });
});
