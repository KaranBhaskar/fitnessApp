import type { ActivityLevel, BodyComposition, CalorieTarget, MeasurementEntry, SexForEstimate } from "../types";

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function cmToIn(cm: number): number {
  return cm / 2.54;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToIn(cm);
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: totalInches - feet * 12 };
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function estimateBodyFatPercentage(input: {
  sex: SexForEstimate;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;
}): number {
  const heightIn = cmToIn(input.heightCm);
  const waistIn = cmToIn(input.waistCm);
  const neckIn = cmToIn(input.neckCm);
  if (input.sex === "female") {
    const hipIn = cmToIn(input.hipCm ?? input.waistCm);
    return 163.205 * Math.log10(waistIn + hipIn - neckIn) - 97.684 * Math.log10(heightIn) - 78.387;
  }
  return 86.01 * Math.log10(waistIn - neckIn) - 70.041 * Math.log10(heightIn) + 36.76;
}

export function calculateBodyComposition(
  measurement: MeasurementEntry,
  sex: SexForEstimate,
): BodyComposition {
  const bmi = calculateBmi(measurement.weightKg, measurement.heightCm);
  const bodyFatPercentage = Math.max(
    3,
    Math.min(
      65,
      estimateBodyFatPercentage({
        sex,
        heightCm: measurement.heightCm,
        waistCm: measurement.waistCm,
        neckCm: measurement.neckCm,
        hipCm: measurement.hipCm,
      }),
    ),
  );
  const fatMassKg = measurement.weightKg * (bodyFatPercentage / 100);
  return {
    bmi,
    bodyFatPercentage,
    fatMassKg,
    leanMassKg: measurement.weightKg - fatMassKg,
  };
}

export function estimateMaintenanceCalories(input: {
  sex: SexForEstimate;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
}): number {
  const sexAdjustment = input.sex === "male" ? 5 : -161;
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexAdjustment;
  return Math.round(bmr * activityMultipliers[input.activityLevel]);
}

export function calculateCalorieTarget(input: {
  sex: SexForEstimate;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
}): CalorieTarget {
  const maintenanceCalories = estimateMaintenanceCalories(input);
  return {
    maintenanceCalories,
    minGoalCalories: Math.round(maintenanceCalories * 0.82),
    maxGoalCalories: Math.round(maintenanceCalories * 0.95),
  };
}

export function calculateProteinTarget(weightKg: number): number {
  return Math.round(weightKg * 1.7);
}

export function isWithinCalorieGoal(calories: number, target: CalorieTarget): boolean {
  return calories >= target.minGoalCalories && calories <= target.maxGoalCalories;
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
