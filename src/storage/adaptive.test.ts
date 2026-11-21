import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_KEY,
  appendDailySession,
  DEFAULT_ADAPTIVE_SETTINGS,
  isoWeekOf,
  loadAdaptiveSettings,
  parseAdaptiveSettings,
  saveAdaptiveSettings,
} from "./adaptive";
import { memoryStore } from "./history";

describe("adaptive storage (AC-2, AC-6)", () => {
  it("returns defaults when missing or corrupt", () => {
    const store = memoryStore({ [ADAPTIVE_KEY]: "{bad json" });
    expect(loadAdaptiveSettings(store)).toEqual(DEFAULT_ADAPTIVE_SETTINGS);
    expect(parseAdaptiveSettings(null)).toEqual(DEFAULT_ADAPTIVE_SETTINGS);
  });

  it("persists autoLevel flags, targetAccuracy (70%-95%) and weekly dailyMode", () => {
    const store = memoryStore();
    saveAdaptiveSettings(store, {
      ...DEFAULT_ADAPTIVE_SETTINGS,
      autoLevel: { "vim-motion": true, arithmetic: true, estimation: false, sums: false },
      targetAccuracy: 0.9,
      dailyMode: "blocked",
      dailyModeWeek: "2026-W47",
    });
    const loaded = loadAdaptiveSettings(store);
    expect(loaded.autoLevel["vim-motion"]).toBe(true);
    expect(loaded.autoLevel.arithmetic).toBe(true);
    expect(loaded.targetAccuracy).toBe(0.9);
    expect(loaded.dailyMode).toBe("blocked");
    expect(loaded.dailyModeWeek).toBe("2026-W47");
  });

  it("clamps invalid targetAccuracy values back to default", () => {
    const parsed = parseAdaptiveSettings({
      autoLevel: "bad",
      targetAccuracy: 0.5,
      dailyMode: "unknown",
      dailySessions: [null, 42, { finishedAt: "nope" }],
    });
    expect(parsed.targetAccuracy).toBe(0.85);
    expect(parsed.dailyMode).toBe("interleaved");
    expect(parsed.dailySessions).toEqual([]);
    expect(parseAdaptiveSettings({ dailySessions: "bad" }).dailySessions).toEqual([]);
  });

  it("appends daily session records for the weekly experiment", () => {
    const store = memoryStore();
    const after = appendDailySession(store, {
      finishedAt: Date.UTC(2026, 10, 21, 12),
      week: "2026-W47",
      mode: "interleaved",
      accuracy: 0.85,
      hitsPerMin: 25,
      itemsCompleted: 20,
    });
    expect(after.dailySessions).toHaveLength(1);
    expect(loadAdaptiveSettings(store).dailySessions[0]?.week).toBe("2026-W47");
  });

  it("isoWeekOf computes pure UTC ISO week strings", () => {
    expect(isoWeekOf(Date.UTC(2026, 0, 1, 12))).toBe("2026-W01");
    expect(isoWeekOf(Date.UTC(2026, 10, 21, 12))).toBe("2026-W47");
    expect(isoWeekOf(Date.UTC(2024, 11, 30, 12))).toBe("2025-W01");
  });
});
