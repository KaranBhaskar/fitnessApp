import { describe, expect, it } from "vitest";
import type { FeatureFlags, UserProfile } from "../../types";
import { signedInDestination } from "./routes";

const featureFlags: FeatureFlags = {
  workouts: true,
  nutrition: true,
  measurements: true,
  projections: true,
  friends: true,
  emojiReactions: true,
  calorieStreaks: true,
  proteinStreaks: true,
  onboardingRequired: true,
};

function profile(
  overrides: Partial<UserProfile>,
): UserProfile {
  return {
    id: "user_1",
    email: "user@example.com",
    name: "Fitness user",
    role: "user",
    status: "approved",
    onboardingComplete: true,
    units: {
      weight: "metric",
      height: "metric",
      neck: "metric",
      waist: "metric",
      hip: "metric",
    },
    age: 18,
    sexForEstimate: "male",
    activityLevel: "moderate",
    goal: "fat_loss_strength",
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("signed-in routing", () => {
  it("sends approved admins directly to admin even before onboarding", () => {
    expect(
      signedInDestination(
        profile({
          role: "super_admin",
          onboardingComplete: false,
        }),
        { featureFlags },
      ),
    ).toBe("/admin");
  });

  it("sends pending and suspended users to the wait page", () => {
    expect(
      signedInDestination(profile({ status: "pending" }), { featureFlags }),
    ).toBe("/pending");
    expect(
      signedInDestination(profile({ status: "suspended" }), { featureFlags }),
    ).toBe("/pending");
  });

  it("sends approved users through onboarding before the dashboard", () => {
    expect(
      signedInDestination(
        profile({ onboardingComplete: false }),
        { featureFlags },
      ),
    ).toBe("/onboarding");
    expect(
      signedInDestination(profile({ onboardingComplete: true }), {
        featureFlags,
      }),
    ).toBe("/dashboard");
  });
});
