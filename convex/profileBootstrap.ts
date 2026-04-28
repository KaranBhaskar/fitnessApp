import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { ownerEmails } from "./permissions";

const defaultUnits = {
  weight: "metric",
  height: "metric",
  neck: "metric",
  waist: "metric",
  hip: "metric",
} as const;

export function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

type AuthProfile = Record<string, unknown> & {
  email?: string;
  name?: string;
  image?: string;
  picture?: string;
  pictureUrl?: string;
};

async function getAppMode(ctx: GenericMutationCtx<DataModel>) {
  const setting = await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "mode"))
    .unique();
  return setting?.mode ?? "beta";
}

export async function ensureAppProfileForUser(
  ctx: GenericMutationCtx<DataModel>,
  args: {
    userId: Id<"users">;
    profile?: AuthProfile;
  },
) {
  const authUser = await ctx.db.get(args.userId);
  const email = optionalString(args.profile?.email ?? authUser?.email)?.toLowerCase();
  if (!email) {
    throw new Error(
      "Google sign-in completed, but Convex Auth did not store an email for this user.",
    );
  }

  const name =
    optionalString(args.profile?.name) ??
    optionalString(authUser?.name) ??
    email;
  const image =
    optionalString(args.profile?.image) ??
    optionalString(args.profile?.picture) ??
    optionalString(args.profile?.pictureUrl) ??
    optionalString(authUser?.image);
  const isOwner = ownerEmails().includes(email);
  const now = Date.now();
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .unique();

  if (existing) {
    const patch: Partial<typeof existing> & { updatedAt: number } = {
      email,
      name,
      updatedAt: now,
    };
    if (image !== undefined) patch.image = image;
    if (isOwner) {
      patch.role = "super_admin";
      patch.status = "approved";
    }
    await ctx.db.patch(existing._id, patch);
    if (
      isOwner &&
      (existing.role !== "super_admin" || existing.status !== "approved")
    ) {
      await ctx.db.insert("auditEvents", {
        actorId: args.userId,
        targetUserId: args.userId,
        action: "auto_promote_owner",
        createdAt: now,
      });
    }
    return await ctx.db.get(existing._id);
  }

  const mode = await getAppMode(ctx);
  const status = isOwner || mode === "open" ? "approved" : "pending";
  const role = isOwner ? "super_admin" : "user";
  const profileDocument = {
    userId: args.userId,
    email,
    name,
    leaderboardVisible: true,
    role,
    status,
    onboardingComplete: false,
    units: defaultUnits,
    goal: "fat_loss_strength",
    activityLevel: "moderate",
    sexForEstimate: "male",
    createdAt: now,
    updatedAt: now,
  } as const;
  const profileId = await ctx.db.insert(
    "profiles",
    image === undefined ? profileDocument : { ...profileDocument, image },
  );

  await ctx.db.insert("accessRequests", {
    userId: args.userId,
    status,
    requestedAt: now,
  });
  return await ctx.db.get(profileId);
}
