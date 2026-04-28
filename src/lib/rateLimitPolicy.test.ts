import { describe, expect, it } from "vitest";
import { canSendDailyReaction, isWithinRateLimit, rateLimitRules } from "./rateLimitPolicy";

describe("rate limit policy", () => {
  it("allows requests below the window capacity", () => {
    const now = Date.UTC(2026, 3, 26, 19, 0, 0);
    const status = isWithinRateLimit([now - 1_000, now - 2_000], rateLimitRules.friendRequest, now);
    expect(status.ok).toBe(true);
    expect(status.remaining).toBe(rateLimitRules.friendRequest.limit - 3);
  });

  it("blocks requests at capacity and gives a retry time", () => {
    const now = Date.UTC(2026, 3, 26, 19, 0, 0);
    const timestamps = Array.from({ length: rateLimitRules.emojiReaction.limit }, (_, index) => now - index * 1_000);
    const status = isWithinRateLimit(timestamps, rateLimitRules.emojiReaction, now);
    expect(status.ok).toBe(false);
    expect(status.retryAt).toBeGreaterThan(now);
  });

  it("allows one reaction per target date", () => {
    expect(canSendDailyReaction(["2026-04-25"], "2026-04-26")).toBe(true);
    expect(canSendDailyReaction(["2026-04-26"], "2026-04-26")).toBe(false);
  });
});
