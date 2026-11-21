import { describe, expect, it } from "vitest";
import { division } from "../gen/division";
import type { DailySessionRecord } from "../storage/adaptive";
import type { ReviewCard } from "../storage/review";
import { replayElo } from "./elo";
import type { TrainingEvent } from "./event";
import { newCard } from "./fsrs";
import { kcStats } from "./kc";
import {
  buildDailyPlan,
  compareDailyModes,
  isKcStalled,
  recommendAll,
  recommendForDrill,
} from "./recommend";
import { DAY_MS } from "./summary";

const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);

function makeEvent(
  drill: TrainingEvent["drill"],
  kc: string,
  ok: boolean,
  timeMs: number,
  i: number,
  at = NOW - (30 - i) * DAY_MS,
  config = "L4",
): TrainingEvent {
  return { at, drill, config, kc, ok, timeMs, extra: { seed: i + 1, i } };
}

describe("recommendations (AC-5)", () => {
  it("triggers all four rules according to the spec table with honest wording", () => {
    // 1. Plateau for >= 2 weeks -> suggests raising level or interleaving
    const plateauRecs = recommendForDrill({
      drillId: "arithmetic",
      plateau: { since: NOW - 15 * DAY_MS, slope: -0.2 },
      events: [],
      kcs: [],
      now: NOW,
    });
    expect(plateauRecs.map((r) => r.kind)).toEqual(["plateau"]);
    expect(plateauRecs[0]?.message).toMatch(/subir o nível|intercalar/i);
    expect(plateauRecs[0]?.message).toContain("deve ajudar");

    // Plateau shorter than 2 weeks -> no recommendation
    const shortPlateau = recommendForDrill({
      drillId: "arithmetic",
      plateau: { since: NOW - 10 * DAY_MS, slope: 0 },
      events: [],
      kcs: [],
      now: NOW,
    });
    expect(shortPlateau).toEqual([]);

    // 2. Accuracy > 97% with stable speed (CV <= 0.35) -> suggests raising level
    const highAccEvents = Array.from({ length: 40 }, (_, i) =>
      makeEvent("calc", "arithmetic.add", true, 1000 + (i % 2) * 50, i),
    );
    const highAccRecs = recommendForDrill({
      drillId: "arithmetic",
      plateau: null,
      events: highAccEvents,
      kcs: kcStats(highAccEvents),
      now: NOW,
    });
    expect(highAccRecs.map((r) => r.kind)).toEqual(["high-accuracy"]);
    expect(highAccRecs[0]?.message).toMatch(/subir o nível/i);
    expect(highAccRecs[0]?.message).toContain("deve ajudar");

    // 3. Accuracy < 70% -> suggests lowering level (or preview in Vim)
    const lowAccEvents = Array.from({ length: 10 }, (_, i) =>
      makeEvent("vim.motion", "f", i < 6, 1500, i),
    );
    const lowAccVim = recommendForDrill({
      drillId: "vim-motion",
      isVim: true,
      plateau: null,
      events: lowAccEvents,
      kcs: kcStats(lowAccEvents),
      now: NOW,
    });
    expect(lowAccVim.map((r) => r.kind)).toEqual(["low-accuracy"]);
    expect(lowAccVim[0]?.message).toMatch(/descer|prévia/i);
    expect(lowAccVim[0]?.message).toContain("deve ajudar");

    const lowAccCalc = recommendForDrill({
      drillId: "estimation",
      plateau: null,
      events: lowAccEvents,
      kcs: kcStats(lowAccEvents),
      now: NOW,
    });
    expect(lowAccCalc[0]?.message).toMatch(/descer/i);
    expect(lowAccCalc[0]?.message).not.toMatch(/prévia/i);

    // 4. KC with no improvement after 20 opportunities -> suggests Aprender lesson (Vim) or focused drill
    const stalledVimEvents = Array.from({ length: 22 }, (_, i) =>
      makeEvent("vim.motion", "f", i % 2 === 0, 1500, i),
    );
    expect(isKcStalled(stalledVimEvents, "f")).toBe(true);
    const stalledVim = recommendForDrill({
      drillId: "vim-motion",
      isVim: true,
      plateau: null,
      events: stalledVimEvents,
      kcs: kcStats(stalledVimEvents),
      now: NOW,
      findLesson: (kc) => (kc === "f" ? "u4-f-t" : undefined),
    });
    const stalledRec = stalledVim.find((r) => r.kind === "stalled-kc");
    expect(stalledRec).toBeDefined();
    expect(stalledRec?.lessonId).toBe("u4-f-t");
    expect(stalledRec?.message).toMatch(/Aprender/i);
    expect(stalledRec?.message).toContain("deve ajudar");

    // Non-Vim stalled KC -> suggests focused drill
    const stalledCalcEvents = Array.from({ length: 22 }, (_, i) =>
      makeEvent("calc", "arithmetic.mul", i % 5 !== 0, 1500, i),
    );
    const stalledCalc = recommendForDrill({
      drillId: "arithmetic",
      plateau: null,
      events: stalledCalcEvents,
      kcs: kcStats(stalledCalcEvents),
      now: NOW,
    });
    const calcRec = stalledCalc.find((r) => r.kind === "stalled-kc");
    expect(calcRec).toBeDefined();
    expect(calcRec?.message).toContain("deve ajudar");
    expect(calcRec?.message).not.toMatch(/\d+%\s*de\s*melhor/i);
  });

  it("does not flag an already mastered or improving KC as stalled", () => {
    const mastered = Array.from({ length: 25 }, (_, i) =>
      makeEvent("calc", "arithmetic.add", true, 900, i),
    );
    expect(isKcStalled(mastered, "arithmetic.add")).toBe(false);

    const improving = Array.from({ length: 24 }, (_, i) =>
      makeEvent("calc", "arithmetic.div", i >= 8, 1200, i),
    );
    expect(isKcStalled(improving, "arithmetic.div")).toBe(false);
  });

  it("recommendAll computes recommendations keyed by drill id", () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent("calc", "arithmetic.add", i < 5, 1000, i),
    );
    const map = recommendAll(
      [
        {
          id: "arithmetic",
          label: "Aritmética",
          configs: [
            {
              key: "arithmetic|60s|{}",
              label: "60 s",
              unit: "acertos/min",
              rounds: [],
              unassistedCount: 10,
              fit: null,
              plateau: { since: NOW - 20 * DAY_MS, slope: 0 },
              weeklyRate: 0,
              firstScore: 20,
              lastScore: 20,
              spanWeeks: 3,
            },
          ],
          kcs: kcStats(events),
          kcCurve: [],
          bigrams: [],
          charErrors: [],
        },
        {
          id: "vim-motion",
          label: "Vim: Movimento",
          configs: [],
          kcs: [],
          kcCurve: [],
          bigrams: [],
          charErrors: [],
        },
        {
          id: "vim-edit",
          label: "Vim: Edição",
          configs: [],
          kcs: [],
          kcCurve: [],
          bigrams: [],
          charErrors: [],
        },
        {
          id: "typing",
          label: "Digitação: Código",
          configs: [],
          kcs: [],
          kcCurve: [],
          bigrams: [],
          charErrors: [],
        },
        {
          id: "text",
          label: "Digitação: Texto",
          configs: [],
          kcs: [],
          kcCurve: [],
          bigrams: [],
          charErrors: [],
        },
      ],
      [
        ...events,
        makeEvent("vim.motion", "f", true, 0, 100),
        makeEvent("vim.edit", "dd", true, 500, 101),
        makeEvent("typing.code", "cpp", true, 400, 102),
        makeEvent("typing.text", "pt", true, 400, 103),
      ],
      NOW,
    );
    expect(map["arithmetic"]?.some((r) => r.kind === "plateau")).toBe(true);
    expect(map["arithmetic"]?.some((r) => r.kind === "low-accuracy")).toBe(true);
    expect(map["vim-motion"]).toEqual([]);
    expect(map["vim-edit"]).toEqual([]);
    expect(map["typing"]).toEqual([]);
    expect(map["text"]).toEqual([]);

    // Zero-mean times do not trigger high-accuracy CV rule
    const zeroTimes = Array.from({ length: 12 }, (_, i) =>
      makeEvent("calc", "arithmetic.add", true, 0, i),
    );
    expect(
      recommendForDrill({
        drillId: "arithmetic",
        plateau: null,
        events: zeroTimes,
        kcs: kcStats(zeroTimes),
        now: NOW,
      }),
    ).toEqual([]);
  });
});

describe("daily plan (AC-4) and weekly experiment comparison (AC-6)", () => {
  it("buildDailyPlan creates a 5-10 min session with due review cards and 3 weakest KCs with reasons", () => {
    const p = division.generate(1, { kinds: ["floor"] });
    const dueCards: ReviewCard[] = [
      {
        id: `${p.skill}#${String(p.seed)}`,
        kind: "calc",
        item: { mode: "division", seed: p.seed, params: p.params },
        skill: p.skill,
        prompt: p.prompt,
        card: newCard(NOW),
      },
    ];
    // Four KCs: f is very irregular (high CV), arithmetic.div is slow/weak, estimation.overflow is weak, arithmetic.add is strong
    const events: TrainingEvent[] = [
      ...Array.from({ length: 12 }, (_, i) =>
        makeEvent("vim.motion", "f", true, i % 2 === 0 ? 400 : 2000, i),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        makeEvent("calc", "arithmetic.div", i < 7, 2500, i + 20, NOW - DAY_MS, "arithmetic"),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        makeEvent("calc", "estimation.overflow", i < 8, 2200, i + 40, NOW - DAY_MS, "estimation"),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        makeEvent("calc", "arithmetic.add", true, 600, i + 60, NOW - DAY_MS, "arithmetic"),
      ),
    ];
    const elo = replayElo(events, NOW);
    const interleaved = buildDailyPlan({ dueCards, events, elo, mode: "interleaved" });
    expect(interleaved.estimatedMinutes).toBeGreaterThanOrEqual(5);
    expect(interleaved.estimatedMinutes).toBeLessThanOrEqual(10);
    expect(interleaved.blocks.some((b) => b.kind === "review")).toBe(true);
    const kcBlocks = interleaved.blocks.filter((b) => b.kind === "kc");
    expect(kcBlocks).toHaveLength(3);
    // f must explain its high CV ("irregular: CV ...")
    const fBlock = kcBlocks.find((b) => b.kc === "f");
    expect(fBlock).toBeDefined();
    expect(fBlock?.reason).toMatch(/irregular: CV/i);
    expect(fBlock?.level).not.toBeNull();

    const blocked = buildDailyPlan({ dueCards, events, elo, mode: "blocked" });
    expect(blocked.mode).toBe("blocked");
    expect(blocked.estimatedMinutes).toBeGreaterThanOrEqual(5);
    expect(blocked.estimatedMinutes).toBeLessThanOrEqual(10);
    expect(blocked.blocks[0]?.kind).toBe("review");
  });

  it("buildDailyPlan provides starter blocks when there is no history yet", () => {
    const plan = buildDailyPlan({
      dueCards: [],
      events: [],
      elo: { users: {}, items: {} },
      mode: "interleaved",
    });
    expect(plan.estimatedMinutes).toBeGreaterThanOrEqual(5);
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(10);
    expect(plan.blocks.length).toBeGreaterThanOrEqual(3);
    for (const block of plan.blocks) {
      expect(block.reason.length).toBeGreaterThan(0);
    }
  });

  it("compareDailyModes compares interleaved and blocked gains across weeks", () => {
    const sessions: DailySessionRecord[] = [
      {
        finishedAt: NOW - 14 * DAY_MS,
        week: "2026-W45",
        mode: "interleaved",
        accuracy: 0.8,
        hitsPerMin: 20,
        itemsCompleted: 30,
      },
      {
        finishedAt: NOW - 12 * DAY_MS,
        week: "2026-W45",
        mode: "interleaved",
        accuracy: 0.86,
        hitsPerMin: 26,
        itemsCompleted: 35,
      },
      {
        finishedAt: NOW - 7 * DAY_MS,
        week: "2026-W46",
        mode: "blocked",
        accuracy: 0.82,
        hitsPerMin: 24,
        itemsCompleted: 30,
      },
      {
        finishedAt: NOW - 5 * DAY_MS,
        week: "2026-W46",
        mode: "blocked",
        accuracy: 0.84,
        hitsPerMin: 27,
        itemsCompleted: 32,
      },
    ];
    const summary = compareDailyModes(sessions);
    expect(summary.interleaved?.sessions).toBe(2);
    expect(summary.interleaved?.weeks).toBe(1);
    expect(summary.interleaved?.gainHitsPerMin).toBeCloseTo(6, 5);
    expect(summary.blocked?.sessions).toBe(2);
    expect(summary.blocked?.gainHitsPerMin).toBeCloseTo(3, 5);

    const empty = compareDailyModes([]);
    expect(empty).toEqual({ interleaved: null, blocked: null });
  });

  it("handles due-only plans, multiple due cards, vim-edit KCs and unknown calc prefixes", () => {
    const p1 = division.generate(1, { kinds: ["floor"] });
    const p2 = division.generate(2, { kinds: ["floor"] });
    const dueCards: ReviewCard[] = [p1, p2].map((p) => ({
      id: `${p.skill}#${String(p.seed)}`,
      kind: "calc",
      item: { mode: "division", seed: p.seed, params: p.params },
      skill: p.skill,
      prompt: p.prompt,
      card: newCard(NOW),
    }));

    const dueOnly = buildDailyPlan({
      dueCards,
      events: [],
      elo: { users: {}, items: {} },
      mode: "interleaved",
    });
    expect(dueOnly.blocks).toHaveLength(1);
    expect(dueOnly.blocks[0]?.reason).toBe("2 cartões vencidos no Revisar");

    const mixedEvents: TrainingEvent[] = [
      ...Array.from({ length: 5 }, (_, i) => makeEvent("vim.edit", "dd", true, 1200, i)),
      ...Array.from({ length: 5 }, (_, i) => makeEvent("calc", "unknown.op", true, 1100, i + 10)),
    ];
    const mixed = buildDailyPlan({
      dueCards: [],
      events: mixedEvents,
      elo: { users: {}, items: {} },
      mode: "blocked",
    });
    expect(mixed.blocks.some((b) => b.drill === "vim-edit" && b.level === null)).toBe(true);
    expect(mixed.blocks.some((b) => b.drill === "arithmetic")).toBe(true);
    expect(mixed.blocks.some((b) => b.reason.includes("menores BIS"))).toBe(true);
  });
});
