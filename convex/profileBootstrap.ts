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

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = optionalString(value);
    if (text !== undefined) return text;
  }
  return undefined;
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
  const email = firstString(args.profile?.email, authUser?.email)?.toLowerCase();
  const name =
    firstString(args.profile?.name, authUser?.name) ??
    email ??
    "Fitness user";
  const image =
    firstString(
      args.profile?.image,
      args.profile?.picture,
      args.profile?.pictureUrl,
      authUser?.image,
    );
  const now = Date.now();
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .unique();
  const resolvedEmail =
    email ?? optionalString(existing?.email)?.toLowerCase();
  const isOwner =
    resolvedEmail !== undefined && ownerEmails().includes(resolvedEmail);

  if (existing) {
    const patch: Partial<typeof existing> & { updatedAt: number } = {
      name,
      updatedAt: now,
    };
    if (resolvedEmail !== undefined) patch.email = resolvedEmail;
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
    {
      ...profileDocument,
      ...(email === undefined ? {} : { email }),
      ...(image === undefined ? {} : { image }),
    },
  );

  await ctx.db.insert("accessRequests", {
    userId: args.userId,
    status,
    requestedAt: now,
  });
  return await ctx.db.get(profileId);
}
