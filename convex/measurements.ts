import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwnerOrAdmin, requireApproved, requireFeature } from "./permissions";
import { enforceRateLimit } from "./rateLimit";
import { assertDateKey, assertNumberRange } from "./validation";

export const list = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "measurements");
    const { userId, profile } = await requireApproved(ctx);
    const targetUserId = args.userId ?? userId;
    assertOwnerOrAdmin(userId, targetUserId, profile.role);
    return await ctx.db.query("measurements").withIndex("by_user_date", (q) => q.eq("userId", targetUserId)).order("desc").take(365);
  },
});

export const upsert = mutation({
  args: {
    date: v.string(),
    weightKg: v.number(),
    heightCm: v.number(),
    neckCm: v.number(),
    waistCm: v.number(),
    hipCm: v.optional(v.number()),
    confirmedLargeChange: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "measurements");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "logWrite");
    assertDateKey(args.date);
    assertNumberRange("Weight", args.weightKg, 20, 300);
    assertNumberRange("Height", args.heightCm, 80, 250);
    assertNumberRange("Neck", args.neckCm, 15, 80);
    assertNumberRange("Waist", args.waistCm, 40, 250);
    if (args.hipCm !== undefined) assertNumberRange("Hip", args.hipCm, 40, 250);
    const today = new Date().toISOString().slice(0, 10);
    if (args.date !== today) {
      throw new Error("Weight can only be logged for today.");
    }
    const existing = await ctx.db.query("measurements").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date)).unique();
    const previousEntries = await ctx.db
      .query("measurements")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();
    const previous = previousEntries
      .filter((entry) => entry.date < args.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (
      previous &&
      Math.abs(args.weightKg - previous.weightKg) >= 5 &&
      !args.confirmedLargeChange
    ) {
      throw new Error("Confirm this large one-day weight change before saving.");
    }
    const { confirmedLargeChange: _confirmedLargeChange, ...cleanArgs } = args;
    const value = { ...cleanArgs, userId, createdAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("measurements", value);
    await ctx.db.insert("usageEvents", { userId, feature: "measurements", createdAt: Date.now() });
  },
});
