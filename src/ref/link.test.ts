import { describe, expect, it } from "vitest";
import { parseRefHash, refLink } from "./link";

// T46 AC-6: drills link to an entry by "cpp/<id>"; the reader opens "#cpp/<id>".

describe("ref links", () => {
  it("refLink gives the hash of a known entry", () => {
    expect(refLink("cpp/lower_bound")).toBe("#cpp/lower_bound");
    expect(refLink("cpp/priority_queue")).toBe("#cpp/priority_queue");
    expect(refLink("py/bisect_left")).toBe("#py/bisect_left");
    expect(refLink("py/heapq_min")).toBe("#py/heapq_min");
  });

  it("refLink throws on an unknown entry", () => {
    expect(() => refLink("cpp/no_such_entry")).toThrow(/cpp\/no_such_entry/);
    expect(() => refLink("py/no_such_entry")).toThrow(/py\/no_such_entry/);
    expect(() => refLink("python/len")).toThrow();
    expect(() => refLink("lower_bound")).toThrow();
  });

  it("parseRefHash reads lang and id", () => {
    expect(parseRefHash("#cpp/lower_bound")).toEqual({ lang: "cpp", id: "lower_bound" });
    expect(parseRefHash("cpp/set")).toEqual({ lang: "cpp", id: "set" });
    expect(parseRefHash("#py/bisect_left")).toEqual({ lang: "py", id: "bisect_left" });
    expect(parseRefHash("py/deque")).toEqual({ lang: "py", id: "deque" });
  });

  it("parseRefHash rejects other hashes", () => {
    for (const hash of ["", "#", "#cpp", "#cpp/", "#rust/vec", "#cpp/a/b", "#cpp/Bad Id"]) {
      expect(parseRefHash(hash), hash).toBeNull();
    }
  });
});
