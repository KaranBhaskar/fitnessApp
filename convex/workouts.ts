import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertOwnerOrAdmin, requireApproved, requireFeature } from "./permissions";
import { enforceRateLimit } from "./rateLimit";
import { assertDateKey, assertNumberRange, assertStringLength } from "./validation";

const maxPlanDays = 7;
const maxExercisesPerDay = 15;
const maxLoggedSets = 80;
const maxPlansPerUser = 20;
const allowedCategories = new Set(["strength", "bodyweight", "cardio", "mobility", "core", "rest"]);

function validateExercise(exercise: {
  name: string;
  sets: number;
  minReps?: number;
  maxReps?: number;
  durationSeconds?: number;
  incrementKg?: number;
  category: string;
}) {
  assertStringLength("Exercise name", exercise.name, 80);
  assertNumberRange("Sets", exercise.sets, 1, 20);
  if (exercise.minReps !== undefined) assertNumberRange("Minimum reps", exercise.minReps, 1, 500);
  if (exercise.maxReps !== undefined) assertNumberRange("Maximum reps", exercise.maxReps, 1, 500);
  if (
    exercise.minReps !== undefined &&
    exercise.maxReps !== undefined &&
    exercise.minReps > exercise.maxReps
  ) {
    throw new Error("Minimum reps cannot be greater than maximum reps.");
  }
  if (exercise.durationSeconds !== undefined) assertNumberRange("Duration", exercise.durationSeconds, 1, 3600);
  if (exercise.incrementKg !== undefined) assertNumberRange("Increment", exercise.incrementKg, 0, 25);
  if (!allowedCategories.has(exercise.category)) throw new Error("Unsupported exercise category.");
}

function validatePlanInput(args: {
  name: string;
  days: Array<{
    dayName: string;
    focus: string;
    exercises: Array<{
      name: string;
      sets: number;
      minReps?: number;
      maxReps?: number;
      durationSeconds?: number;
      incrementKg?: number;
      category: string;
    }>;
  }>;
}) {
  assertStringLength("Plan name", args.name, 80);
  if (args.days.length < 1 || args.days.length > maxPlanDays) {
    throw new Error(`Plans must have 1-${maxPlanDays} days.`);
  }
  for (const day of args.days) {
    assertStringLength("Day name", day.dayName, 40);
    assertStringLength("Focus", day.focus, 80);
    if (day.exercises.length > maxExercisesPerDay) {
      throw new Error(`Each day can have at most ${maxExercisesPerDay} exercises.`);
    }
    for (const exercise of day.exercises) validateExercise(exercise);
  }
}

function validateLoggedSets(
  sets: Array<{
    exerciseName: string;
    setNumber: number;
    reps?: number;
    weightKg?: number;
    durationSeconds?: number;
  }>,
) {
  if (sets.length > maxLoggedSets) throw new Error(`Workout logs can include at most ${maxLoggedSets} sets.`);
  for (const set of sets) {
    assertStringLength("Exercise name", set.exerciseName, 80);
    assertNumberRange("Set number", set.setNumber, 1, maxLoggedSets);
    if (set.reps !== undefined) assertNumberRange("Reps", set.reps, 0, 500);
    if (set.weightKg !== undefined) assertNumberRange("Weight", set.weightKg, 0, 500);
    if (set.durationSeconds !== undefined) assertNumberRange("Duration", set.durationSeconds, 0, 3600);
  }
}

export const listLogs = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "workouts");
    const { userId, profile } = await requireApproved(ctx);
    const targetUserId = args.userId ?? userId;
    assertOwnerOrAdmin(userId, targetUserId, profile.role);
    return await ctx.db.query("workoutLogs").withIndex("by_user_date", (q) => q.eq("userId", targetUserId)).order("desc").take(365);
  },
});

export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    await requireFeature(ctx, "workouts");
    const { userId } = await requireApproved(ctx);
    const plans = await ctx.db.query("workoutPlans").withIndex("by_user", (q) => q.eq("userId", userId)).take(maxPlansPerUser);
    const result = [];
    for (const plan of plans) {
      const days = await ctx.db.query("planDays").withIndex("by_plan", (q) => q.eq("planId", plan._id)).collect();
      const daysWithExercises = [];
      for (const day of days.sort((a, b) => a.order - b.order)) {
        const exercises = await ctx.db.query("planExercises").withIndex("by_day", (q) => q.eq("dayId", day._id)).collect();
        daysWithExercises.push({ ...day, exercises: exercises.sort((a, b) => a.order - b.order) });
      }
      result.push({ ...plan, days: daysWithExercises });
    }
    return result;
  },
});

export const createPlan = mutation({
  args: {
    name: v.string(),
    days: v.array(
      v.object({
        dayName: v.string(),
        focus: v.string(),
        order: v.number(),
        isRestDay: v.boolean(),
        exercises: v.array(
          v.object({
            name: v.string(),
            sets: v.number(),
            minReps: v.optional(v.number()),
            maxReps: v.optional(v.number()),
            durationSeconds: v.optional(v.number()),
            incrementKg: v.optional(v.number()),
            category: v.string(),
            order: v.number(),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "workouts");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "planWrite");
    validatePlanInput(args);
    const existingPlans = await ctx.db.query("workoutPlans").withIndex("by_user", (q) => q.eq("userId", userId)).take(maxPlansPerUser + 1);
    if (existingPlans.length >= maxPlansPerUser) throw new Error(`You can keep up to ${maxPlansPerUser} workout plans.`);
    const planId = await ctx.db.insert("workoutPlans", {
      userId,
      name: args.name.trim(),
      isDefault: false,
      createdAt: Date.now(),
    });
    for (const day of args.days) {
      const dayId = await ctx.db.insert("planDays", {
        userId,
        planId,
        dayName: day.dayName.trim(),
        focus: day.focus.trim(),
        order: day.order,
        isRestDay: day.isRestDay,
      });
      for (const exercise of day.exercises) {
        await ctx.db.insert("planExercises", {
          userId,
          dayId,
          ...exercise,
          name: exercise.name.trim(),
          category: exercise.category.trim(),
        });
      }
    }
    await ctx.db.insert("usageEvents", { userId, feature: "workoutPlanCreate", createdAt: Date.now() });
    return planId;
  },
});

export const updatePlan = mutation({
  args: {
    planId: v.id("workoutPlans"),
    name: v.string(),
    days: v.array(
      v.object({
        dayName: v.string(),
        focus: v.string(),
        order: v.number(),
        isRestDay: v.boolean(),
        exercises: v.array(
          v.object({
            name: v.string(),
            sets: v.number(),
            minReps: v.optional(v.number()),
            maxReps: v.optional(v.number()),
            durationSeconds: v.optional(v.number()),
            incrementKg: v.optional(v.number()),
            category: v.string(),
            order: v.number(),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "workouts");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "planWrite");
    validatePlanInput(args);
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) throw new Error("Plan not found");

    const oldDays = await ctx.db
      .query("planDays")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();
    for (const day of oldDays) {
      const oldExercises = await ctx.db
        .query("planExercises")
        .withIndex("by_day", (q) => q.eq("dayId", day._id))
        .collect();
      for (const exercise of oldExercises) await ctx.db.delete(exercise._id);
      await ctx.db.delete(day._id);
    }

    await ctx.db.patch(args.planId, { name: args.name.trim() });
    for (const day of args.days) {
      const dayId = await ctx.db.insert("planDays", {
        userId,
        planId: args.planId,
        dayName: day.dayName.trim(),
        focus: day.focus.trim(),
        order: day.order,
        isRestDay: day.isRestDay,
      });
      for (const exercise of day.exercises) {
        await ctx.db.insert("planExercises", {
          userId,
          dayId,
          ...exercise,
          name: exercise.name.trim(),
          category: exercise.category.trim(),
        });
      }
    }
    await ctx.db.insert("usageEvents", { userId, feature: "workoutPlanUpdate", createdAt: Date.now() });
  },
});

export const logWorkout = mutation({
  args: {
    date: v.string(),
    planDayId: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("rest"), v.literal("partial")),
    notes: v.optional(v.string()),
    sets: v.array(v.object({
      exerciseName: v.string(),
      setNumber: v.number(),
      reps: v.optional(v.number()),
      weightKg: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
      completed: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "workouts");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "logWrite");
    assertDateKey(args.date);
    if (args.notes !== undefined) assertStringLength("Notes", args.notes, 500, 0);
    validateLoggedSets(args.sets);
    let planDayId: Id<"planDays"> | undefined = undefined;
    if (args.planDayId) {
      const normalizedDayId = ctx.db.normalizeId("planDays", args.planDayId);
      if (normalizedDayId) {
        const day = await ctx.db.get(normalizedDayId);
        if (day?.userId === userId) planDayId = normalizedDayId;
      }
    }
    const existing = await ctx.db.query("workoutLogs").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date)).unique();
    const workoutId = existing?._id ?? await ctx.db.insert("workoutLogs", {
      userId,
      date: args.date,
      planDayId,
      status: args.status,
      notes: args.notes?.trim(),
      createdAt: Date.now(),
    });
    if (existing) await ctx.db.patch(existing._id, { planDayId, status: args.status, notes: args.notes?.trim() });
    const oldSets = await ctx.db.query("exerciseSetLogs").withIndex("by_workout", (q) => q.eq("workoutLogId", workoutId)).collect();
    for (const set of oldSets) await ctx.db.delete(set._id);
    for (const set of args.sets) await ctx.db.insert("exerciseSetLogs", { userId, workoutLogId: workoutId, ...set, exerciseName: set.exerciseName.trim() });
    await ctx.db.insert("usageEvents", { userId, feature: "workouts", createdAt: Date.now() });
  },
});
