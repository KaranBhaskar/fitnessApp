import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(
  v.literal("super_admin"),
  v.literal("admin"),
  v.literal("user"),
);
const status = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("suspended"),
);
const appMode = v.union(v.literal("beta"), v.literal("open"));
const unitSystem = v.union(v.literal("metric"), v.literal("us"));
const sexForEstimate = v.union(v.literal("male"), v.literal("female"));
const activityLevel = v.union(
  v.literal("sedentary"),
  v.literal("light"),
  v.literal("moderate"),
  v.literal("active"),
  v.literal("athlete"),
);
const goal = v.union(
  v.literal("fat_loss_strength"),
  v.literal("strength"),
  v.literal("wellness"),
);
const relationshipTier = v.literal("friend");
const relationshipStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("blocked"),
);

const visibility = v.object({
  streakStatus: v.boolean(),
  streakLength: v.boolean(),
  workoutSummary: v.boolean(),
  caloriesGoalStatus: v.boolean(),
  proteinGoalStatus: v.boolean(),
  currentWeight: v.boolean(),
  weightTrendline: v.boolean(),
  projections: v.boolean(),
  bodyMeasurements: v.boolean(),
});

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    leaderboardVisible: v.optional(v.boolean()),
    role,
    status,
    onboardingComplete: v.boolean(),
    units: v.object({
      weight: unitSystem,
      height: unitSystem,
      neck: unitSystem,
      waist: unitSystem,
      hip: unitSystem,
    }),
    age: v.optional(v.number()),
    sexForEstimate: v.optional(sexForEstimate),
    activityLevel: v.optional(activityLevel),
    goal: v.optional(goal),
    activeWorkoutPlanId: v.optional(v.id("workoutPlans")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_role", ["role"]),

  appSettings: defineTable({
    key: v.string(),
    mode: v.optional(appMode),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  accessRequests: defineTable({
    userId: v.id("users"),
    status,
    requestedAt: v.number(),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  measurements: defineTable({
    userId: v.id("users"),
    date: v.string(),
    weightKg: v.number(),
    heightCm: v.number(),
    neckCm: v.number(),
    waistCm: v.number(),
    hipCm: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  nutritionLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    calories: v.number(),
    proteinGrams: v.number(),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  workoutPlans: defineTable({
    userId: v.id("users"),
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  planDays: defineTable({
    userId: v.id("users"),
    planId: v.id("workoutPlans"),
    dayName: v.string(),
    focus: v.string(),
    order: v.number(),
    isRestDay: v.boolean(),
  }).index("by_plan", ["planId"]),

  planExercises: defineTable({
    userId: v.id("users"),
    dayId: v.id("planDays"),
    name: v.string(),
    sets: v.number(),
    minReps: v.optional(v.number()),
    maxReps: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    incrementKg: v.optional(v.number()),
    category: v.string(),
    order: v.number(),
  }).index("by_day", ["dayId"]),

  workoutLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    planDayId: v.optional(v.id("planDays")),
    status: v.union(
      v.literal("completed"),
      v.literal("rest"),
      v.literal("partial"),
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  exerciseSetLogs: defineTable({
    userId: v.id("users"),
    workoutLogId: v.id("workoutLogs"),
    exerciseName: v.string(),
    setNumber: v.number(),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    completed: v.boolean(),
  }).index("by_workout", ["workoutLogId"]),

  streakSummaries: defineTable({
    userId: v.id("users"),
    date: v.string(),
    workoutComplete: v.boolean(),
    calorieGoalMet: v.boolean(),
    proteinGoalMet: v.boolean(),
    overallMet: v.boolean(),
    updatedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  relationships: defineTable({
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    tier: relationshipTier,
    status: relationshipStatus,
    visibility,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requester", ["requesterId"])
    .index("by_recipient", ["recipientId"]),

  reactions: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    targetDate: v.string(),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_from_target_date", ["fromUserId", "toUserId", "targetDate"])
    .index("by_to", ["toUserId"]),

  auditEvents: defineTable({
    actorId: v.id("users"),
    targetUserId: v.optional(v.id("users")),
    action: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_target", ["targetUserId"])
    .index("by_action", ["action"]),

  usageEvents: defineTable({
    userId: v.id("users"),
    feature: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_feature", ["userId", "feature"])
    .index("by_feature", ["feature"]),

  rateLimitEvents: defineTable({
    actorId: v.id("users"),
    key: v.string(),
    createdAt: v.number(),
  }).index("by_actor_key", ["actorId", "key"]),
});
