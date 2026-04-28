import { v } from "convex/values";
import { query } from "./_generated/server";
import { assertOwnerOrAdmin, requireApproved, requireFeature } from "./permissions";

function daysBetween(startDateKey: string, endDateKey: string) {
  const start = new Date(`${startDateKey}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDateKey}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

export const weight = query({
  args: {
    userId: v.optional(v.id("users")),
    todayDateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFeature(ctx, "projections");
    const { userId, profile } = await requireApproved(ctx);
    const targetUserId = args.userId ?? userId;
    assertOwnerOrAdmin(userId, targetUserId, profile.role);

    const today = args.todayDateKey ?? new Date().toISOString().slice(0, 10);
    const all = await ctx.db.query("measurements").withIndex("by_user_date", (q) => q.eq("userId", targetUserId)).order("desc").take(14);
    const sorted = all.filter((entry) => entry.date <= today).sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted.at(-1);
    if (!latest) return { trend: "insufficient", projections: [] };

    const sevenDaysAgo = new Date(`${today}T00:00:00.000Z`);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const sevenDayKey = sevenDaysAgo.toISOString().slice(0, 10);
    const recent = sorted.filter((entry) => entry.date >= sevenDayKey);
    if (recent.length < 2) {
      return { latestWeightKg: latest.weightKg, trend: "insufficient", projections: [] };
    }

    const earliest = recent[0];
    const recentLatest = recent.at(-1) ?? latest;
    const dailyChangeKg = (recentLatest.weightKg - earliest.weightKg) / daysBetween(earliest.date, recentLatest.date);
    const trend = Math.abs(dailyChangeKg) < 0.025 ? "flat" : dailyChangeKg < 0 ? "decreasing" : "increasing";

    return {
      latestWeightKg: latest.weightKg,
      dailyChangeKg,
      trend,
      projections: [
        { label: "30 days", daysAhead: 30, projectedWeightKg: latest.weightKg + dailyChangeKg * 30 },
        { label: "3 months", daysAhead: 90, projectedWeightKg: latest.weightKg + dailyChangeKg * 90 },
        { label: "1 year", daysAhead: 365, projectedWeightKg: latest.weightKg + dailyChangeKg * 365 },
      ],
    };
  },
});
