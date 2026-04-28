import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function getProfileByUserId(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
}

export async function requireAuth(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in required." });
  const profile = await getProfileByUserId(ctx, userId);
  return { userId, profile };
}

export async function requireApproved(ctx: Ctx) {
  const session = await requireAuth(ctx);
  if (!session.profile) throw new ConvexError({ code: "PROFILE_REQUIRED", message: "Profile setup required." });
  if (session.profile.status === "suspended") throw new ConvexError({ code: "SUSPENDED", message: "Account is suspended." });
  if (session.profile.status !== "approved" && session.profile.role !== "admin" && session.profile.role !== "super_admin") {
    throw new ConvexError({ code: "PENDING_APPROVAL", message: "Admin approval required." });
  }
  return session as typeof session & { profile: NonNullable<typeof session.profile> };
}

export async function requireAdmin(ctx: Ctx) {
  const session = await requireApproved(ctx);
  if (session.profile.role !== "admin" && session.profile.role !== "super_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return session;
}

export async function requireSuperAdmin(ctx: Ctx) {
  const session = await requireAdmin(ctx);
  if (session.profile.role !== "super_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Super admin access required." });
  }
  return session;
}

export function assertOwnerOrAdmin(actorId: Id<"users">, targetUserId: Id<"users">, role: string) {
  if (actorId === targetUserId) return;
  if (role === "admin" || role === "super_admin") return;
  throw new ConvexError({ code: "FORBIDDEN", message: "You cannot access this user's data." });
}

export async function isFeatureEnabled(ctx: Ctx, key: string) {
  const flag = await ctx.db.query("featureFlags").withIndex("by_key", (q) => q.eq("key", key)).unique();
  return flag?.enabled ?? true;
}

export async function requireFeature(ctx: Ctx, key: string) {
  if (!(await isFeatureEnabled(ctx, key))) {
    throw new ConvexError({ code: "FEATURE_DISABLED", message: `${key} is disabled.` });
  }
}

export function ownerEmails() {
  const raw = process.env.OWNER_EMAIL_ALLOWLIST ?? "";
  return raw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
}
