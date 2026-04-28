import { query } from "./_generated/server";
import { requireApproved } from "./permissions";

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await requireApproved(ctx);
    const measurements = await ctx.db.query("measurements").withIndex("by_user_date", (q) => q.eq("userId", userId)).order("desc").take(30);
    const nutritionLogs = await ctx.db.query("nutritionLogs").withIndex("by_user_date", (q) => q.eq("userId", userId)).order("desc").take(30);
    const workoutLogs = await ctx.db.query("workoutLogs").withIndex("by_user_date", (q) => q.eq("userId", userId)).order("desc").take(60);
    const outgoingRelationships = await ctx.db.query("relationships").withIndex("by_requester", (q) => q.eq("requesterId", userId)).collect();
    const incomingRelationships = await ctx.db.query("relationships").withIndex("by_recipient", (q) => q.eq("recipientId", userId)).collect();
    const appMode = await ctx.db.query("appSettings").withIndex("by_key", (q) => q.eq("key", "mode")).unique();
    const featureFlags = await ctx.db.query("featureFlags").collect();
    const plans = await ctx.db
      .query("workoutPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(20);
    const workoutPlans = [];
    for (const plan of plans) {
      const days = await ctx.db
        .query("planDays")
        .withIndex("by_plan", (q) => q.eq("planId", plan._id))
        .collect();
      const daysWithExercises = [];
      for (const day of days.sort((a, b) => a.order - b.order)) {
        const exercises = await ctx.db
          .query("planExercises")
          .withIndex("by_day", (q) => q.eq("dayId", day._id))
          .collect();
        daysWithExercises.push({
          ...day,
          id: day._id,
          exercises: exercises
            .sort((a, b) => a.order - b.order)
            .map((exercise) => ({ ...exercise, id: exercise._id })),
        });
      }
      workoutPlans.push({ ...plan, id: plan._id, days: daysWithExercises });
    }

    const recentWorkoutLogs = [];
    for (const log of workoutLogs
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)) {
      const sets = await ctx.db
        .query("exerciseSetLogs")
        .withIndex("by_workout", (q) => q.eq("workoutLogId", log._id))
        .collect();
      recentWorkoutLogs.push({
        ...log,
        workoutDayId: log.planDayId ?? "",
        sets: sets.sort((a, b) => a.setNumber - b.setNumber),
      });
    }

    return {
      profile,
      latestMeasurement: measurements.sort((a, b) => a.date.localeCompare(b.date)).at(-1),
      recentMeasurements: measurements.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
      recentNutritionLogs: nutritionLogs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
      recentWorkoutLogs,
      workoutPlans,
      relationships: [...outgoingRelationships, ...incomingRelationships],
      appMode: appMode?.mode ?? "beta",
      featureFlags,
    };
  },
});
