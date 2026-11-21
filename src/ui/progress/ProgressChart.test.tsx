// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fitPowerLaw, parseDay } from "../../stats/learning";
import { DAY_MS } from "../../stats/summary";
import { ProgressChart } from "./ProgressChart";

const BASE = parseDay("2026-01-01") ?? 0;

describe("ProgressChart", () => {
  it("renders SVG points, assisted symbol, fitted curve, goal line, date axis and screen-reader table", () => {
    const rounds = Array.from({ length: 10 }, (_, i) => ({
      at: BASE + i * 3 * DAY_MS,
      score: 60 - 30 * Math.pow(i + 1, -0.5),
      assisted: i === 4,
    }));
    const fit = fitPowerLaw(rounds);
    const goal = {
      target: 58,
      deadline: "2026-03-01",
      setAt: BASE,
      baseline: 30,
    };
    const { container } = render(
      <ProgressChart
        title="Aritmética 120 s"
        unit="acertos/min"
        rounds={rounds}
        fit={fit}
        goal={goal}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Unassisted rounds rendered as circles, assisted round rendered as distinct polygon/diamond.
    expect(container.querySelectorAll("circle[data-point='round']")).toHaveLength(9);
    expect(container.querySelectorAll("polygon[data-point='assisted']")).toHaveLength(1);
    expect(container.querySelector("path[data-series='curve']")).not.toBeNull();
    expect(container.querySelector("line[data-series='goal']")).not.toBeNull();
    // Axis shows dates (YYYY-MM-DD or DD/MM), not round numbers.
    expect(svg?.textContent).toContain("01/01");
    // Accessible table inside <details> "Ver como tabela".
    expect(screen.getByText("Ver como tabela")).toBeTruthy();
    expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(11);
  });
});
