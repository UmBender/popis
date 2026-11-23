// Bug: `npm run check` and `npm run coverage` failed by chance: fast-check
// drew a new seed every run, so rare branches were covered only sometimes,
// and heavy or screen tests overran tight time limits on a slow, busy
// laptop. Outside fuzzing, property tests must run with a fixed seed, and
// the time limits must leave room for a slow machine.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { read } from "../source-files";

describe("regression T37 stable-gates", () => {
  it("property tests run with a fixed seed outside fuzzing", () => {
    // Arrange: this file is not part of `npm run test:fuzz` (`.prop.test` only).
    // Act
    const { seed } = fc.readConfigureGlobal();

    // Assert
    expect(seed).toBeTypeOf("number");
  });

  it("tests get a 20 s default timeout and the year-of-storage test 300 s", () => {
    // Arrange
    const config = read("vite.config.ts");
    const sizeTest = read("src/storage/size.test.ts");

    // Act
    const defaultTimeout = /testTimeout:\s*([\d_]+)/.exec(config)?.[1];
    const yearTimeout = /a year of daily practice[^\n]*timeout:\s*([\d_]+)/.exec(sizeTest)?.[1];

    // Assert
    expect(defaultTimeout).toBe("20_000");
    expect(yearTimeout).toBe("300_000");
  });
});
