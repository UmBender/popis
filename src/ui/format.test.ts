import { describe, expect, it } from "vitest";
import { seconds, skillLabel } from "./format";

describe("format", () => {
  it("skillLabel names known skills and passes unknown ones through", () => {
    expect(skillLabel("arithmetic.mul")).toBe("Multiplicação");
    expect(skillLabel("division.floor")).toBe("Piso");
    expect(skillLabel("future.skill")).toBe("future.skill");
  });

  it("seconds uses two decimals and a decimal comma", () => {
    expect(seconds(1500)).toBe("1,50 s");
    expect(seconds(0)).toBe("0,00 s");
  });
});
