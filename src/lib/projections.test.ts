import { describe, expect, it } from "vitest";
import { calculateWeightProjection } from "./projections";
import type { MeasurementEntry } from "../types";

function m(date: string, weightKg: number): MeasurementEntry {
  return {
    id: date,
    userId: "u1",
    date,
    weightKg,
    heightCm: 175,
    neckCm: 37,
    waistCm: 84,
  };
}

describe("weight projections", () => {
  it("uses the latest weight and last seven day trend", () => {
    const summary = calculateWeightProjection(
      [
        m("2026-04-18", 75.6),
        m("2026-04-19", 75.4),
        m("2026-04-22", 74.8),
        m("2026-04-26", 74.2),
      ],
      "2026-04-26",
    );
    expect(summary.trend).toBe("decreasing");
    expect(summary.latestWeightKg).toBe(74.2);
    expect(summary.projections).toHaveLength(3);
    expect(summary.projections[0].projectedWeightKg).toBeLessThan(74.2);
  });

  it("does not forecast from sparse recent data", () => {
    const summary = calculateWeightProjection([m("2026-04-26", 74.2)], "2026-04-26");
    expect(summary.trend).toBe("insufficient");
    expect(summary.projections).toEqual([]);
  });

  it("reports increasing and flat trends honestly", () => {
    const increasing = calculateWeightProjection([m("2026-04-20", 74), m("2026-04-26", 75)], "2026-04-26");
    const flat = calculateWeightProjection([m("2026-04-20", 74), m("2026-04-26", 74.1)], "2026-04-26");
    expect(increasing.trend).toBe("increasing");
    expect(flat.trend).toBe("flat");
  });
});
