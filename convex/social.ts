import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProfileByUserId, requireApproved, requireFeature } from "./permissions";
import { enforceRateLimit } from "./rateLimit";
import { assertDateKey, assertEmail, assertStringLength } from "./validation";

const friendVisibility = {
  streakStatus: true,
  streakLength: true,
  workoutSummary: true,
  caloriesGoalStatus: true,
  proteinGoalStatus: true,
  currentWeight: true,
  weightTrendline: true,
  projections: true,
  bodyMeasurements: true,
};

export const relationships = query({
  args: {},
  handler: async (ctx) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    const outgoing = await ctx.db
      .query("relationships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect();
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();
    return [...outgoing, ...incoming];
  },
});

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const allLogs = await ctx.db.query("workoutLogs").order("desc").take(5000);
    const outgoing = await ctx.db
      .query("relationships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect();
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();
    const relationships = [...outgoing, ...incoming];
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = addDays(today, -6);

    return profiles
      .filter((profile) => {
        if (profile.userId === userId) return true;
        const isFriend = relationships.some(
          (relationship) =>
            relationship.status === "accepted" &&
            [relationship.requesterId, relationship.recipientId].includes(
              profile.userId,
            ),
        );
        return isFriend || profile.leaderboardVisible !== false;
      })
      .map((profile) => {
        const logs = allLogs.filter(
          (log) =>
            log.userId === profile.userId &&
            (log.status === "completed" || log.status === "rest"),
        );
        const dates = new Set(logs.map((log) => log.date));
        const streakLength = countBackwards(today, (date) => dates.has(date));
        const workoutsThisWeek = logs.filter(
          (log) => log.date >= sevenDaysAgo && log.date <= today,
        ).length;
        const activeToday = dates.has(today);
        const relationship = relationshipStatus(
          userId,
          profile.userId,
          relationships,
        );
        return {
          userId: profile.userId,
          name: profile.name ?? "Fitness user",
          email:
            relationship === "self" || relationship === "friends"
              ? profile.email ?? ""
              : "",
          activeToday,
          streakLength,
          workoutsThisWeek,
          score:
            streakLength * 10 + workoutsThisWeek * 2 + (activeToday ? 5 : 0),
          relationshipStatus: relationship,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.streakLength - a.streakLength ||
          b.workoutsThisWeek - a.workoutsThisWeek ||
          a.name.localeCompare(b.name),
      )
      .map((row, index) => ({ ...row, rank: index + 1 }));
  },
});

export const friendDetail = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    const targetProfile = await getProfileByUserId(ctx, args.targetUserId);
    if (!targetProfile || targetProfile.status !== "approved") return null;

    const outgoing = await ctx.db
      .query("relationships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect();
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();
    const relationship = [...outgoing, ...incoming].find(
      (candidate) =>
        candidate.status === "accepted" &&
        [candidate.requesterId, candidate.recipientId].includes(userId) &&
        [candidate.requesterId, candidate.recipientId].includes(args.targetUserId),
    );
    const isSelf = userId === args.targetUserId;
    if (!isSelf && !relationship) return null;

    const visibility = isSelf ? friendVisibility : relationship!.visibility;
    const includeMeasurements =
      visibility.currentWeight ||
      visibility.weightTrendline ||
      visibility.projections ||
      visibility.bodyMeasurements ||
      visibility.caloriesGoalStatus ||
      visibility.proteinGoalStatus;
    const includeNutrition =
      visibility.caloriesGoalStatus || visibility.proteinGoalStatus;
    const includeWorkouts =
      visibility.streakStatus ||
      visibility.streakLength ||
      visibility.workoutSummary;

    const measurements = includeMeasurements
      ? await ctx.db
          .query("measurements")
          .withIndex("by_user_date", (q) => q.eq("userId", args.targetUserId))
          .order("desc")
          .take(30)
      : [];
    const nutrition = includeNutrition
      ? await ctx.db
          .query("nutritionLogs")
          .withIndex("by_user_date", (q) => q.eq("userId", args.targetUserId))
          .order("desc")
          .take(30)
      : [];
    const workoutLogs = includeWorkouts
      ? await ctx.db
          .query("workoutLogs")
          .withIndex("by_user_date", (q) => q.eq("userId", args.targetUserId))
          .order("desc")
          .take(30)
      : [];
    const workouts = [];
    for (const workout of workoutLogs) {
      const sets = visibility.workoutSummary
        ? await ctx.db
            .query("exerciseSetLogs")
            .withIndex("by_workout", (q) => q.eq("workoutLogId", workout._id))
            .collect()
        : [];
      workouts.push({ ...workout, workoutDayId: workout.planDayId ?? "", sets });
    }

    return {
      profile: targetProfile,
      relationship: relationship ?? {
        requesterId: userId,
        recipientId: userId,
        status: "accepted",
        tier: "friend",
        visibility,
      },
      measurements,
      nutrition,
      workouts,
    };
  },
});

export const searchUsers = mutation({
  args: {
    term: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "profileSearch");
    const term = args.term?.trim().toLowerCase() ?? "";
    if (term.length > 80) throw new Error("Search is too long.");
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const outgoing = await ctx.db
      .query("relationships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect();
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();
    const relationships = [...outgoing, ...incoming];

    return profiles
      .filter((profile) => {
        if (profile.userId === userId) return true;
        const isFriend = relationships.some(
          (relationship) =>
            relationship.status === "accepted" &&
            [relationship.requesterId, relationship.recipientId].includes(
              profile.userId,
            ),
        );
        return isFriend || profile.leaderboardVisible !== false;
      })
      .filter((profile) => {
        if (!term) return true;
        return [profile.name ?? "", profile.email ?? ""].some((value) =>
          value.toLowerCase().includes(term),
        );
      })
      .map((profile) => {
        const relationship = relationshipStatus(
          userId,
          profile.userId,
          relationships,
        );
        return {
          userId: profile.userId,
          name: profile.name ?? "Fitness user",
          email:
            relationship === "self" || relationship === "friends"
              ? profile.email ?? ""
              : "",
          relationshipStatus: relationship,
        };
      });
  },
});

export const requestFriend = mutation({
  args: {
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "friendRequest");
    const recipient = await getProfileByUserId(ctx, args.recipientId);
    if (!recipient || recipient.status !== "approved") throw new Error("User is not available for friend requests.");
    const outgoing = await ctx.db
      .query("relationships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect();
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();
    const duplicate = [...outgoing, ...incoming].some(
      (relationship) =>
        [relationship.requesterId, relationship.recipientId].includes(
          userId,
        ) &&
        [relationship.requesterId, relationship.recipientId].includes(
          args.recipientId,
        ),
    );
    if (duplicate || userId === args.recipientId) return;
    await ctx.db.insert("relationships", {
      requesterId: userId,
      recipientId: args.recipientId,
      tier: "friend",
      status: "pending",
      visibility: friendVisibility,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("usageEvents", {
      userId,
      feature: "friendRequest",
      createdAt: Date.now(),
    });
  },
});

export const acceptFriend = mutation({
  args: {
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();
    const request = incoming.find(
      (relationship) =>
        relationship.requesterId === args.requesterId &&
        relationship.status === "pending",
    );
    if (!request) throw new Error("Friend request not found.");
    await ctx.db.patch(request._id, {
      status: "accepted",
      visibility: friendVisibility,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("usageEvents", {
      userId,
      feature: "friendAccept",
      createdAt: Date.now(),
    });
  },
});

export const setVisibility = mutation({
  args: {
    relationshipId: v.id("relationships"),
    visibility: v.object({
      streakStatus: v.boolean(),
      streakLength: v.boolean(),
      workoutSummary: v.boolean(),
      caloriesGoalStatus: v.boolean(),
      proteinGoalStatus: v.boolean(),
      currentWeight: v.boolean(),
      weightTrendline: v.boolean(),
      projections: v.boolean(),
      bodyMeasurements: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    const relationship = await ctx.db.get(args.relationshipId);
    if (
      !relationship ||
      (relationship.requesterId !== userId &&
        relationship.recipientId !== userId)
    )
      throw new Error("Relationship not found.");
    await ctx.db.patch(args.relationshipId, {
      visibility: args.visibility,
      updatedAt: Date.now(),
    });
  },
});

export const requestEmailInvite = mutation({
  args: {
    email: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "friends");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "inviteCreate");
    const email = assertEmail(args.email);
    if (args.note !== undefined) assertStringLength("Invite note", args.note, 500, 0);
    await ctx.db.insert("usageEvents", {
      userId,
      feature: "emailInvite",
      createdAt: Date.now(),
    });
    await ctx.db.insert("auditEvents", {
      actorId: userId,
      action: "request_email_invite",
      metadata: { email, note: args.note?.trim() ?? "" },
      createdAt: Date.now(),
    });
  },
});

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function countBackwards(dateKey: string, predicate: (date: string) => boolean) {
  let cursor = dateKey;
  let count = 0;
  while (predicate(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
    if (count > 730) break;
  }
  return count;
}

function relationshipStatus(
  currentUserId: string,
  otherUserId: string,
  relationships: Array<{
    requesterId: string;
    recipientId: string;
    status: string;
  }>,
) {
  if (currentUserId === otherUserId) return "self";
  const relationship = relationships.find(
    (candidate) =>
      [candidate.requesterId, candidate.recipientId].includes(currentUserId) &&
      [candidate.requesterId, candidate.recipientId].includes(otherUserId),
  );
  if (!relationship) return "none";
  if (relationship.status === "accepted") return "friends";
  if (
    relationship.status === "pending" &&
    relationship.requesterId === currentUserId
  )
    return "requested";
  if (
    relationship.status === "pending" &&
    relationship.recipientId === currentUserId
  )
    return "incoming";
  return "none";
}

export const sendReaction = mutation({
  args: {
    toUserId: v.id("users"),
    targetDate: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "emojiReactions");
    const { userId } = await requireApproved(ctx);
    await enforceRateLimit(ctx, userId, "emojiReaction");
    assertDateKey(args.targetDate);
    assertStringLength("Emoji", args.emoji, 16);
    if (userId === args.toUserId) return;
    const recipient = await getProfileByUserId(ctx, args.toUserId);
    if (!recipient || recipient.status !== "approved") throw new Error("User is not available for reactions.");
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_from_target_date", (q) =>
        q
          .eq("fromUserId", userId)
          .eq("toUserId", args.toUserId)
          .eq("targetDate", args.targetDate),
      )
      .unique();
    if (existing) return;
    await ctx.db.insert("reactions", {
      fromUserId: userId,
      toUserId: args.toUserId,
      targetDate: args.targetDate,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
    await ctx.db.insert("usageEvents", {
      userId,
      feature: "emojiReactions",
      createdAt: Date.now(),
    });
  },
});
