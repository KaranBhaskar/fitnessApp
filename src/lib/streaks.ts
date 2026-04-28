import type { CalorieTarget, NutritionLog, StreakSummary, WorkoutLog } from "../types";
import { addDays, lastNDays } from "./date";
import { calculateProteinTarget, isWithinCalorieGoal } from "./calculations";

function countBackwards(dateKey: string, predicate: (date: string) => boolean): number {
  let cursor = dateKey;
  let count = 0;
  while (predicate(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
    if (count > 730) break;
  }
  return count;
}

export function calculateStreakSummary(input: {
  todayDateKey: string;
  workoutLogs: WorkoutLog[];
  nutritionLogs: NutritionLog[];
  calorieTarget: CalorieTarget;
  weightKg: number;
}): StreakSummary {
  const workoutDates = new Set(input.workoutLogs.filter((log) => log.status === "completed" || log.status === "rest").map((log) => log.date));
  const nutritionByDate = new Map(input.nutritionLogs.map((log) => [log.date, log]));
  const proteinTarget = calculateProteinTarget(input.weightKg);

  const workoutStreak = countBackwards(input.todayDateKey, (date) => workoutDates.has(date));
  const calorieStreak = countBackwards(input.todayDateKey, (date) => {
    const log = nutritionByDate.get(date);
    return Boolean(log && isWithinCalorieGoal(log.calories, input.calorieTarget));
  });
  const proteinStreak = countBackwards(input.todayDateKey, (date) => {
    const log = nutritionByDate.get(date);
    return Boolean(log && log.proteinGrams >= proteinTarget);
  });
  const overallStreak = countBackwards(input.todayDateKey, (date) => {
    const log = nutritionByDate.get(date);
    return Boolean(
      workoutDates.has(date) &&
        log &&
        isWithinCalorieGoal(log.calories, input.calorieTarget) &&
        log.proteinGrams >= proteinTarget,
    );
  });

  return {
    workoutStreak,
    calorieStreak,
    proteinStreak,
    overallStreak,
    activeToday: lastNDays(input.todayDateKey, 1).some((date) => workoutDates.has(date)),
  };
}
