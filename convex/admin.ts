import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProfileByUserId, ownerEmails, requireAdmin, requireAuth, requireSuperAdmin } from "./permissions";
import { optionalString } from "./profileBootstrap";

const featureKeys = [
  "workouts",
  "nutrition",
  "measurements",
  "projections",
  "friends",
  "emojiReactions",
  "calorieStreaks",
  "proteinStreaks",
  "onboardingRequired",
] as const;

export const setupSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await requireAuth(ctx);
    const authUser = await ctx.db.get(userId);
    const email = optionalString(authUser?.email)?.toLowerCase();
    if (!email || !ownerEmails().includes(email)) throw new Error("This Google account is not in OWNER_EMAIL_ALLOWLIST.");
    if (!profile) throw new Error("Run ensureProfile first.");
    await ctx.db.patch(profile._id, { role: "super_admin", status: "approved", updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { actorId: userId, targetUserId: userId, action: "bootstrap_super_admin", createdAt: Date.now() });
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("profiles").collect();
    const usage = await ctx.db.query("usageEvents").order("desc").take(500);
    const audits = await ctx.db.query("auditEvents").order("desc").take(50);
    const flags = await ctx.db.query("featureFlags").collect();
    const mode = await ctx.db.query("appSettings").withIndex("by_key", (q) => q.eq("key", "mode")).unique();
    return {
      counts: {
        total: users.length,
        pending: users.filter((u) => u.status === "pending").length,
        approved: users.filter((u) => u.status === "approved").length,
        suspended: users.filter((u) => u.status === "suspended").length,
      },
      usage,
      audits,
      flags,
      mode: mode?.mode ?? "beta",
    };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("profiles").collect();
  },
});

export const userDetail = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const profile = await getProfileByUserId(ctx, args.targetUserId);
    const measurements = await ctx.db.query("measurements").withIndex("by_user_date", (q) => q.eq("userId", args.targetUserId)).collect();
    const nutrition = await ctx.db.query("nutritionLogs").withIndex("by_user_date", (q) => q.eq("userId", args.targetUserId)).collect();
    const workouts = await ctx.db.query("workoutLogs").withIndex("by_user_date", (q) => q.eq("userId", args.targetUserId)).collect();
    await ctx.db.insert("auditEvents", { actorId: userId, targetUserId: args.targetUserId, action: "view_user_detail", createdAt: Date.now() });
    return { profile, measurements, nutrition, workouts };
  },
});

export const logUserDetailView = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    await ctx.db.insert("auditEvents", { actorId: userId, targetUserId: args.targetUserId, action: "view_user_detail", createdAt: Date.now() });
  },
});

export const setUserStatus = mutation({
  args: {
    targetUserId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    const { userId, profile: actorProfile } = await requireAdmin(ctx);
    const profile = await getProfileByUserId(ctx, args.targetUserId);
    if (!profile) throw new Error("User profile not found.");
    if (profile.role !== "user" && actorProfile.role !== "super_admin") {
      throw new Error("Only the site owner can change an admin account.");
    }
    if (args.targetUserId === userId && args.status === "suspended") {
      throw new Error("You cannot suspend your own account.");
    }
    await ctx.db.patch(profile._id, { status: args.status, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { actorId: userId, targetUserId: args.targetUserId, action: `set_status_${args.status}`, createdAt: Date.now() });
  },
});

export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const profile = await getProfileByUserId(ctx, args.targetUserId);
    if (!profile) throw new Error("User profile not found.");
    await ctx.db.patch(profile._id, { role: args.role, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { actorId: userId, targetUserId: args.targetUserId, action: `set_role_${args.role}`, createdAt: Date.now() });
  },
});

export const setAppMode = mutation({
  args: { mode: v.union(v.literal("beta"), v.literal("open")) },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdmin(ctx);
    const existing = await ctx.db.query("appSettings").withIndex("by_key", (q) => q.eq("key", "mode")).unique();
    if (existing) await ctx.db.patch(existing._id, { mode: args.mode, updatedBy: userId, updatedAt: Date.now() });
    else await ctx.db.insert("appSettings", { key: "mode", mode: args.mode, updatedBy: userId, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { actorId: userId, action: `set_app_mode_${args.mode}`, createdAt: Date.now() });
  },
});

export const setFeatureFlag = mutation({
  args: {
    key: v.union(
      v.literal("workouts"),
      v.literal("nutrition"),
      v.literal("measurements"),
      v.literal("projections"),
      v.literal("friends"),
      v.literal("emojiReactions"),
      v.literal("calorieStreaks"),
      v.literal("proteinStreaks"),
      v.literal("onboardingRequired"),
    ),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const existing = await ctx.db.query("featureFlags").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
    if (existing) await ctx.db.patch(existing._id, { enabled: args.enabled, updatedBy: userId, updatedAt: Date.now() });
    else await ctx.db.insert("featureFlags", { key: args.key, enabled: args.enabled, updatedBy: userId, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { actorId: userId, action: `set_feature_${args.key}_${args.enabled}`, createdAt: Date.now() });
  },
});
