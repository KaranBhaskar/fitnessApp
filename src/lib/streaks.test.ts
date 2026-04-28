import { describe, expect, it } from "vitest";
import { calculateStreakSummary } from "./streaks";
import type { NutritionLog, WorkoutLog } from "../types";

function workout(date: string, status: WorkoutLog["status"] = "completed"): WorkoutLog {
  return { id: date, userId: "u1", date, workoutDayId: "day", status, sets: [] };
}

function nutrition(date: string, calories = 2100, proteinGrams = 130): NutritionLog {
  return { id: date, userId: "u1", date, calories, proteinGrams };
}

describe("streaks", () => {
  it("counts workout and rest days as consistency", () => {
    const streaks = calculateStreakSummary({
      todayDateKey: "2026-04-26",
      workoutLogs: [workout("2026-04-26", "rest"), workout("2026-04-25"), workout("2026-04-24")],
      nutritionLogs: [nutrition("2026-04-26"), nutrition("2026-04-25"), nutrition("2026-04-24")],
      calorieTarget: { maintenanceCalories: 2500, minGoalCalories: 2000, maxGoalCalories: 2300 },
      weightKg: 75,
    });
    expect(streaks.workoutStreak).toBe(3);
    expect(streaks.overallStreak).toBe(3);
    expect(streaks.activeToday).toBe(true);
  });

  it("breaks calorie streak when calories are outside the goal range", () => {
    const streaks = calculateStreakSummary({
      todayDateKey: "2026-04-26",
      workoutLogs: [workout("2026-04-26"), workout("2026-04-25")],
      nutritionLogs: [nutrition("2026-04-26", 2600), nutrition("2026-04-25", 2100)],
      calorieTarget: { maintenanceCalories: 2500, minGoalCalories: 2000, maxGoalCalories: 2300 },
      weightKg: 75,
    });
    expect(streaks.calorieStreak).toBe(0);
    expect(streaks.overallStreak).toBe(0);
  });
});
