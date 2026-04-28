import type { MeasurementEntry } from "../types";

export const LARGE_DAILY_WEIGHT_CHANGE_KG = 5;

export function latestMeasurementOnOrBefore(
  measurements: MeasurementEntry[],
  dateKey: string,
) {
  return [...measurements]
    .filter((entry) => entry.date <= dateKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

export function latestMeasurementBefore(
  measurements: MeasurementEntry[],
  dateKey: string,
) {
  return [...measurements]
    .filter((entry) => entry.date < dateKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

export function requiresLargeWeightChangeConfirmation(input: {
  previousWeightKg?: number;
  nextWeightKg: number;
}) {
  if (input.previousWeightKg == null) return false;
  return (
    Math.abs(input.nextWeightKg - input.previousWeightKg) >=
    LARGE_DAILY_WEIGHT_CHANGE_KG
  );
}
