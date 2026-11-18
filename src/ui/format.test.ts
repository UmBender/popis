import { describe, expect, it } from "vitest";
import { answerText, seconds, skillLabel } from "./format";

describe("format", () => {
  it("skillLabel names known skills and passes unknown ones through", () => {
    expect(skillLabel("arithmetic.mul")).toBe("Multiplicação");
    expect(skillLabel("division.floor")).toBe("Piso");
    expect(skillLabel("future.skill")).toBe("future.skill");
  });

  it("skillLabel names the primes skill", () => {
    expect(skillLabel("primes.spf")).toBe("Menor fator primo");
  });

  it("skillLabel names the estimation kinds", () => {
    expect(skillLabel("estimation.complexity")).toBe("Complexidade");
    expect(skillLabel("estimation.magnitude")).toBe("Ordem de grandeza");
    expect(skillLabel("estimation.overflow")).toBe("Overflow");
  });

  it("answerText shows the option number and text of multiple-choice answers", () => {
    const base = { skill: "s", prompt: "p", seed: 0, params: null };
    expect(answerText({ ...base, answer: "2", choices: ["int32", "int64", "nenhum"] })).toBe(
      "2) int64",
    );
    expect(answerText({ ...base, answer: "-4" })).toBe("-4");
  });

  it("skillLabel names the sums skills", () => {
    expect(skillLabel("sums.sum")).toBe("Somatório");
    expect(skillLabel("sums.loop")).toBe("Laços");
  });

  it("seconds uses two decimals and a decimal comma", () => {
    expect(seconds(1500)).toBe("1,50 s");
    expect(seconds(0)).toBe("0,00 s");
  });
});
