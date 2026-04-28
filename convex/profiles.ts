import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAuth } from "./permissions";
import { ensureAppProfileForUser } from "./profileBootstrap";
import { assertNumberRange } from "./validation";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await requireAuth(ctx);
    return { userId, profile };
  },
});

export const authConfiguration = query({
  args: {},
  handler: async () => ({
    hasGoogleClientId: Boolean(process.env.AUTH_GOOGLE_ID),
    hasGoogleClientSecret: Boolean(process.env.AUTH_GOOGLE_SECRET),
    hasSiteUrl: Boolean(process.env.SITE_URL),
    hasOwnerAllowlist: Boolean(process.env.OWNER_EMAIL_ALLOWLIST),
  }),
});

export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ensureAppProfileForUser(ctx, { userId });
  },
});

export const completeOnboarding = mutation({
  args: {
    age: v.number(),
    sexForEstimate: v.union(v.literal("male"), v.literal("female")),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("light"),
      v.literal("moderate"),
      v.literal("active"),
      v.literal("athlete"),
    ),
    weightKg: v.number(),
    heightCm: v.number(),
    neckCm: v.number(),
    waistCm: v.number(),
    hipCm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireAuth(ctx);
    if (!profile) throw new Error("Profile required.");
    assertNumberRange("Age", args.age, 1, 100);
    assertNumberRange("Weight", args.weightKg, 20, 300);
    assertNumberRange("Height", args.heightCm, 80, 250);
    assertNumberRange("Neck", args.neckCm, 15, 80);
    assertNumberRange("Waist", args.waistCm, 40, 250);
    if (args.hipCm !== undefined) assertNumberRange("Hip", args.hipCm, 40, 250);
    await ctx.db.patch(profile._id, {
      age: args.age,
      sexForEstimate: args.sexForEstimate,
      activityLevel: args.activityLevel,
      onboardingComplete: true,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("measurements", {
      userId,
      date: new Date().toISOString().slice(0, 10),
      weightKg: args.weightKg,
      heightCm: args.heightCm,
      neckCm: args.neckCm,
      waistCm: args.waistCm,
      hipCm: args.hipCm,
      createdAt: Date.now(),
    });
  },
});

export const updateSettings = mutation({
  args: {
    age: v.optional(v.number()),
    activityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("light"),
        v.literal("moderate"),
        v.literal("active"),
        v.literal("athlete"),
      ),
    ),
    goal: v.optional(
      v.union(
        v.literal("fat_loss_strength"),
        v.literal("strength"),
        v.literal("wellness"),
      ),
    ),
    units: v.optional(
      v.object({
        weight: v.union(v.literal("metric"), v.literal("us")),
        height: v.union(v.literal("metric"), v.literal("us")),
        neck: v.union(v.literal("metric"), v.literal("us")),
        waist: v.union(v.literal("metric"), v.literal("us")),
        hip: v.union(v.literal("metric"), v.literal("us")),
      }),
    ),
    leaderboardVisible: v.optional(v.boolean()),
    activeWorkoutPlanId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireAuth(ctx);
    if (!profile) throw new Error("Profile required.");
    const patch: {
      age?: number;
      activityLevel?: "sedentary" | "light" | "moderate" | "active" | "athlete";
      goal?: "fat_loss_strength" | "strength" | "wellness";
      units?: {
        weight: "metric" | "us";
        height: "metric" | "us";
        neck: "metric" | "us";
        waist: "metric" | "us";
        hip: "metric" | "us";
      };
      leaderboardVisible?: boolean;
      activeWorkoutPlanId?: Id<"workoutPlans">;
      updatedAt: number;
    } = { updatedAt: Date.now() };
    if (args.age !== undefined) {
      assertNumberRange("Age", args.age, 1, 100);
      patch.age = args.age;
    }
    if (args.activityLevel !== undefined)
      patch.activityLevel = args.activityLevel;
    if (args.goal !== undefined) patch.goal = args.goal;
    if (args.units !== undefined) patch.units = args.units;
    if (args.leaderboardVisible !== undefined)
      patch.leaderboardVisible = args.leaderboardVisible;
    if (args.activeWorkoutPlanId !== undefined) {
      const planId = ctx.db.normalizeId("workoutPlans", args.activeWorkoutPlanId);
      if (planId) {
        const plan = await ctx.db.get(planId);
        if (plan?.userId === userId) patch.activeWorkoutPlanId = planId;
      }
    }
    await ctx.db.patch(profile._id, patch);
  },
});
