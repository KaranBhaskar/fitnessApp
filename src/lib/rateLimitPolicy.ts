export interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
}

export const rateLimitRules = {
  friendRequest: { key: "friendRequest", limit: 8, windowMs: 60 * 60 * 1000 },
  inviteCreate: { key: "inviteCreate", limit: 10, windowMs: 60 * 60 * 1000 },
  emojiReaction: { key: "emojiReaction", limit: 20, windowMs: 60 * 60 * 1000 },
  profileSearch: { key: "profileSearch", limit: 30, windowMs: 10 * 60 * 1000 },
  logWrite: { key: "logWrite", limit: 120, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;

export function isWithinRateLimit(
  timestamps: number[],
  rule: RateLimitRule,
  now = Date.now(),
): { ok: boolean; retryAt?: number; remaining: number } {
  const recent = timestamps.filter((timestamp) => now - timestamp < rule.windowMs).sort((a, b) => a - b);
  if (recent.length >= rule.limit) {
    return {
      ok: false,
      retryAt: recent[0] + rule.windowMs,
      remaining: 0,
    };
  }
  return {
    ok: true,
    remaining: rule.limit - recent.length - 1,
  };
}

export function canSendDailyReaction(existingReactionDates: string[], targetDate: string): boolean {
  return !existingReactionDates.includes(targetDate);
}
