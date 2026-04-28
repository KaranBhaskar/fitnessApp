import { describe, expect, it } from "vitest";
import type { MeasurementEntry } from "../types";
import {
  latestMeasurementBefore,
  latestMeasurementOnOrBefore,
  requiresLargeWeightChangeConfirmation,
} from "./weightLog";

const measurements: MeasurementEntry[] = [
  {
    id: "m1",
    userId: "u1",
    date: "2026-04-25",
    weightKg: 75,
    heightCm: 175,
    neckCm: 37,
    waistCm: 84,
  },
  {
    id: "m2",
    userId: "u1",
    date: "2026-04-27",
    weightKg: 74,
    heightCm: 175,
    neckCm: 37,
    waistCm: 83,
  },
];

describe("weight log guardrails", () => {
  it("carries forward the previous measurement when today is missing", () => {
    expect(latestMeasurementOnOrBefore(measurements, "2026-04-26")?.weightKg).toBe(75);
  });

  it("uses the exact date measurement when it exists", () => {
    expect(latestMeasurementOnOrBefore(measurements, "2026-04-27")?.weightKg).toBe(74);
  });

  it("compares against the previous day before saving today's weight", () => {
    expect(latestMeasurementBefore(measurements, "2026-04-27")?.weightKg).toBe(75);
    expect(
      requiresLargeWeightChangeConfirmation({
        previousWeightKg: 75,
        nextWeightKg: 69.9,
      }),
    ).toBe(true);
    expect(
      requiresLargeWeightChangeConfirmation({
        previousWeightKg: 75,
        nextWeightKg: 71,
      }),
    ).toBe(false);
  });
});
