import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const rules = {
  friendRequest: { limit: 6, windowMs: 60 * 60 * 1000 },
  inviteCreate: { limit: 5, windowMs: 60 * 60 * 1000 },
  emojiReaction: { limit: 12, windowMs: 60 * 60 * 1000 },
  profileSearch: { limit: 30, windowMs: 10 * 60 * 1000 },
  logWrite: { limit: 80, windowMs: 60 * 60 * 1000 },
  planWrite: { limit: 5, windowMs: 60 * 60 * 1000 },
};

export async function enforceRateLimit(ctx: MutationCtx, actorId: Id<"users">, key: keyof typeof rules) {
  const rule = rules[key];
  const now = Date.now();
  const recent = await ctx.db.query("rateLimitEvents").withIndex("by_actor_key", (q) => q.eq("actorId", actorId).eq("key", key)).collect();
  const active = recent.filter((event) => now - event.createdAt < rule.windowMs).sort((a, b) => a.createdAt - b.createdAt);
  const expired = recent.filter((event) => now - event.createdAt >= rule.windowMs);
  for (const event of expired.slice(0, 25)) {
    await ctx.db.delete(event._id);
  }
  if (active.length >= rule.limit) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Please wait before trying that again.",
      retryAt: active[0].createdAt + rule.windowMs,
    });
  }
  await ctx.db.insert("rateLimitEvents", { actorId, key, createdAt: now });
}
