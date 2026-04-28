import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwnerOrAdmin, requireApproved, requireFeature } from "./permissions";
import { enforceRateLimit } from "./rateLimit";
import { assertDateKey, assertNumberRange } from "./validation";

export const list = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "nutrition");
    const { userId, profile } = await requireApproved(ctx);
    const targetUserId = args.userId ?? userId;
    assertOwnerOrAdmin(userId, targetUserId, profile.role);
    return await ctx.db.query("nutritionLogs").withIndex("by_user_date", (q) => q.eq("userId", targetUserId)).order("desc").take(365);
  },
});

export const upsert = mutation({
  args: {
    date: v.string(),
    calories: v.number(),
    proteinGrams: v.number(),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "nutrition");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "logWrite");
    assertDateKey(args.date);
    assertNumberRange("Calories", args.calories, 0, 10000);
    assertNumberRange("Protein", args.proteinGrams, 0, 500);
    const existing = await ctx.db.query("nutritionLogs").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date)).unique();
    const value = { ...args, userId, createdAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("nutritionLogs", value);
    await ctx.db.insert("usageEvents", { userId, feature: "nutrition", createdAt: Date.now() });
  },
});
