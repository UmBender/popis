import { describe, expect, it } from "vitest";
import { GDB_LESSONS } from "../gdb/curriculum";
import { memoryStore, type KeyValueStore } from "./history";
import {
  GDB_LEARN_KEY,
  completeGdbLesson,
  loadGdbCompleted,
  parseGdbCompleted,
  saveGdbCompleted,
} from "./gdb-learn";

// T25 AC-7: GDB Learn progress in popis.gdb-learn using v2 format of popis.vim-learn.

describe("gdb learn storage (AC-7)", () => {
  it("starts empty on a fresh store", () => {
    expect(loadGdbCompleted(memoryStore())).toEqual([]);
  });

  it("saves completed lessons in v2 format deduplicated in curriculum order", () => {
    const store = memoryStore();
    const second = GDB_LESSONS[1]!.id;
    const first = GDB_LESSONS[0]!.id;

    completeGdbLesson(store, second);
    completeGdbLesson(store, first);
    completeGdbLesson(store, second);

    expect(loadGdbCompleted(store)).toEqual([first, second]);
    expect(JSON.parse(store.getItem(GDB_LEARN_KEY) as string)).toEqual({
      version: 2,
      completed: [first, second],
    });
  });

  it("drops unknown ids and bad JSON shapes", () => {
    const first = GDB_LESSONS[0]!.id;
    expect(parseGdbCompleted({ version: 2, completed: [first, "bogus", 42] })).toEqual([first]);
    expect(parseGdbCompleted({ version: 2, completed: first })).toEqual([]);
    expect(parseGdbCompleted(null)).toEqual([]);
    expect(loadGdbCompleted(memoryStore({ [GDB_LEARN_KEY]: "{bad" }))).toEqual([]);
  });

  it("tolerates quota errors when saving", () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveGdbCompleted(full, [GDB_LESSONS[0]!.id]);
    }).not.toThrow();
  });
});
