import type { MeasurementEntry, ProjectionSummary } from "../types";
import { daysBetween } from "./date";

export function calculateWeightProjection(
  measurements: MeasurementEntry[],
  todayDateKey: string,
): ProjectionSummary {
  const sorted = [...measurements]
    .filter((entry) => entry.date <= todayDateKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = sorted.at(-1);
  if (!latest) {
    return { trend: "insufficient", projections: [] };
  }

  const sevenDaysAgo = new Date(`${todayDateKey}T00:00:00.000Z`);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDayKey = sevenDaysAgo.toISOString().slice(0, 10);
  const recent = sorted.filter((entry) => entry.date >= sevenDayKey);

  if (recent.length < 2) {
    return { latestWeightKg: latest.weightKg, trend: "insufficient", projections: [] };
  }

  const earliest = recent[0];
  const recentLatest = recent.at(-1) ?? latest;
  const elapsedDays = Math.max(1, daysBetween(earliest.date, recentLatest.date));
  const dailyChangeKg = (recentLatest.weightKg - earliest.weightKg) / elapsedDays;
  const trend = Math.abs(dailyChangeKg) < 0.025 ? "flat" : dailyChangeKg < 0 ? "decreasing" : "increasing";

  return {
    latestWeightKg: latest.weightKg,
    dailyChangeKg,
    trend,
    projections: [
      { label: "30 days", daysAhead: 30, projectedWeightKg: latest.weightKg + dailyChangeKg * 30 },
      { label: "3 months", daysAhead: 90, projectedWeightKg: latest.weightKg + dailyChangeKg * 90 },
      { label: "1 year", daysAhead: 365, projectedWeightKg: latest.weightKg + dailyChangeKg * 365 },
    ],
  };
}
