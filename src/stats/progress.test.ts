import { describe, expect, it } from "vitest";
import type { JsonValue } from "../core/problem";
import type { SessionRecord } from "../storage/history";
import type { VimResult } from "../storage/vim";
import { DAY_MS } from "./summary";
import { parseDay, WEEK_MS } from "./learning";
import { computeProgress, seriesSummaryLine } from "./progress";

const BASE = parseDay("2026-01-01") ?? 0;

function calcSession(
  mode: "arithmetic" | "algebra",
  durationMs: number,
  correct: number,
  at: number,
  params: JsonValue = { k: 1 },
): SessionRecord {
  return {
    version: 1,
    mode,
    finishedAt: at,
    durationMs,
    seed: at,
    params,
    log: Array.from({ length: correct }, (_, i) => ({
      problem: {
        prompt: "1+1",
        answer: "2",
        skill: `${mode}.add`,
        seed: i,
        params: {},
      },
      outcome: "correct" as const,
      timeMs: 1200,
      corrections: 0,
    })),
  };
}

describe("computeProgress", () => {
  it("groupDrillConfigs separates configurations and ranks most played first", () => {
    const now = BASE + 6 * WEEK_MS;
    const sessions: SessionRecord[] = [
      // 3 rounds of 60s
      ...Array.from({ length: 3 }, (_, i) =>
        calcSession("arithmetic", 60_000, 30 + i, BASE + i * DAY_MS),
      ),
      // 10 rounds of 120s (most played)
      ...Array.from({ length: 10 }, (_, i) =>
        calcSession("arithmetic", 120_000, 76 + i * 2, BASE + i * 4 * DAY_MS),
      ),
    ];
    const progress = computeProgress(
      { sessions, typing: [], text: [], vimMotion: [], vimEdit: [], events: [] },
      now,
    );
    const arith = progress.find((d) => d.id === "arithmetic");
    expect(arith).toBeDefined();
    expect(arith?.configs).toHaveLength(2);
    expect(arith?.configs[0]?.label).toContain("120 s");
    expect(arith?.configs[0]?.rounds).toHaveLength(10);
    expect(arith?.configs[1]?.label).toContain("60 s");
    const line = seriesSummaryLine("Aritmética", arith!.configs[0]!);
    expect(line).toContain("Aritmética");
    expect(line).toContain("acertos/min");
  });

  it("assisted rounds stay visible but are excluded from power-law fit and plateau", () => {
    const now = BASE + 20 * DAY_MS;
    const vimMotion: VimResult[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        version: 1 as const,
        kind: "motion" as const,
        level: 1 as const,
        durationS: 60,
        seed: i + 1,
        reached: 10 + i,
        skipped: 0,
        efficiency: 0.9,
        finishedAt: BASE + i * DAY_MS,
        assisted: false,
      })),
      // 3 assisted rounds should appear in rounds (total 10), but fit needs 8 unassisted and plateau needs 10 unassisted.
      ...Array.from({ length: 3 }, (_, i) => ({
        version: 1 as const,
        kind: "motion" as const,
        level: 1 as const,
        durationS: 60,
        seed: 100 + i,
        reached: 25,
        skipped: 0,
        efficiency: 1,
        finishedAt: BASE + (7 + i) * DAY_MS,
        assisted: true,
      })),
    ];
    const progress = computeProgress(
      { sessions: [], typing: [], text: [], vimMotion, vimEdit: [], events: [] },
      now,
    );
    const motion = progress.find((d) => d.id === "vim-motion");
    expect(motion?.configs[0]?.rounds).toHaveLength(10);
    expect(motion?.configs[0]?.unassistedCount).toBe(7);
    expect(motion?.configs[0]?.fit).toBeNull();
    expect(motion?.configs[0]?.plateau).toBeNull();
  });

  it("computeProgress covers review, typing, text, vim-edit, assisted-only series and 1-round summaries", () => {
    const now = BASE + 10 * DAY_MS;
    const progress = computeProgress(
      {
        sessions: [
          {
            ...calcSession("arithmetic", 0, 5, BASE, { list: [1, 2], nested: { b: 2, a: 1 } }),
            mode: "review",
          },
          calcSession("algebra", 60_000, 10, BASE, { list: [1, 2], z: 1, a: 2 }),
          calcSession("algebra", 120_000, 20, BASE + DAY_MS, { list: [3, 4], a: 1, z: 2 }),
        ],
        typing: [
          {
            version: 1,
            snippetId: "cpp-bfs",
            language: "cpp",
            seed: 1,
            wpm: 55,
            accuracy: 0.95,
            errors: 1,
            timeMs: 20_000,
            finishedAt: BASE,
          },
        ],
        text: [
          {
            version: 1,
            config: "pt-60s",
            seed: 1,
            wpm: 60,
            raw: 62,
            accuracy: 0.97,
            chars: { correct: 100, incorrect: 2, extra: 0, missed: 0 },
            timeMs: 60_000,
            finishedAt: BASE,
          },
        ],
        vimMotion: [
          {
            version: 1,
            kind: "motion",
            level: 1,
            durationS: 60,
            seed: 1,
            reached: 12,
            skipped: 0,
            efficiency: 0.9,
            finishedAt: BASE,
            assisted: true,
          },
        ],
        vimEdit: [
          {
            version: 1,
            kind: "edit",
            durationS: 60,
            seed: 1,
            reached: 8,
            skipped: 0,
            efficiency: 0.9,
            finishedAt: BASE,
            assisted: false,
          },
          {
            version: 1,
            kind: "edit",
            durationS: 60,
            seed: 2,
            reached: 6,
            skipped: 0,
            efficiency: 0.9,
            finishedAt: BASE + 3 * DAY_MS,
            assisted: false,
          },
        ],
        events: [],
      },
      now,
    );
    expect(progress.map((d) => d.id)).toEqual([
      "algebra",
      "review",
      "typing",
      "text",
      "vim-motion",
      "vim-edit",
    ]);
    const reviewSeries = progress[1]!.configs[0]!;
    expect(seriesSummaryLine("Revisar", reviewSeries)).toContain("1 rodada");
    const editSeries = progress[5]!.configs[0]!;
    expect(seriesSummaryLine("Vim: Edição", editSeries)).toContain("1 semana");
    expect(seriesSummaryLine("Vim: Edição", editSeries)).toContain("-");
  });
});
