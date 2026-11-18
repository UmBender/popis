import { describe, expect, it } from "vitest";
import { parseKinds, validateKinds } from "./kinds";

const ALL = ["a", "b", "c"] as const;

describe("kind settings", () => {
  it("validate requires at least one kind", () => {
    expect(validateKinds({ kinds: ["a"] })).toEqual([]);
    expect(validateKinds({ kinds: [] })).toEqual(["no-kind"]);
  });

  it("parseKinds keeps known kinds once, in the stored order", () => {
    expect(parseKinds({ kinds: ["c", "a", "c"] }, ALL)).toEqual({ kinds: ["c", "a"] });
  });

  it.each([null, 3, "a", {}, { kinds: "a" }, { kinds: [] }, { kinds: ["a", "z"] }])(
    "parseKinds rejects %j",
    (value) => {
      expect(parseKinds(value, ALL)).toBeNull();
    },
  );
});
