import { describe, expect, it } from "vitest";
import {
  calculateBmi,
  calculateBodyComposition,
  calculateCalorieTarget,
  calculateProteinTarget,
  cmToIn,
  estimateBodyFatPercentage,
  kgToLb,
  lbToKg,
} from "./calculations";
import type { MeasurementEntry } from "../types";

describe("fitness calculators", () => {
  it("converts metric and US weights without meaningful drift", () => {
    expect(lbToKg(kgToLb(75))).toBeCloseTo(75, 5);
    expect(cmToIn(177.8)).toBeCloseTo(70, 2);
  });

  it("calculates BMI from kg and cm", () => {
    expect(calculateBmi(75, 175)).toBeCloseTo(24.49, 2);
  });

  it("estimates body fat using the sex-specific Navy circumference method", () => {
    const male = estimateBodyFatPercentage({ sex: "male", heightCm: 175, waistCm: 84, neckCm: 37 });
    const female = estimateBodyFatPercentage({ sex: "female", heightCm: 165, waistCm: 76, neckCm: 33, hipCm: 96 });
    expect(male).toBeGreaterThan(15);
    expect(male).toBeLessThan(30);
    expect(female).toBeGreaterThan(20);
    expect(female).toBeLessThan(40);
  });

  it("derives lean and fat mass from body fat percentage", () => {
    const measurement: MeasurementEntry = {
      id: "m1",
      userId: "u1",
      date: "2026-04-26",
      weightKg: 75,
      heightCm: 175,
      neckCm: 37,
      waistCm: 84,
      hipCm: 94,
    };
    const composition = calculateBodyComposition(measurement, "male");
    expect(composition.bmi).toBeCloseTo(24.49, 2);
    expect(composition.leanMassKg + composition.fatMassKg).toBeCloseTo(75, 5);
  });

  it("creates a safe calorie goal range under maintenance", () => {
    const target = calculateCalorieTarget({
      sex: "male",
      weightKg: 75,
      heightCm: 175,
      age: 17,
      activityLevel: "moderate",
    });
    expect(target.maintenanceCalories).toBeGreaterThan(target.maxGoalCalories);
    expect(target.maxGoalCalories).toBeGreaterThan(target.minGoalCalories);
    expect(target.minGoalCalories).toBeGreaterThan(1500);
  });

  it("sets protein from body weight", () => {
    expect(calculateProteinTarget(75)).toBe(128);
  });
});
