import type { Relationship, SharingVisibility, UserProfile } from "../types";

export const privateVisibility: SharingVisibility = {
  streakStatus: false,
  streakLength: false,
  workoutSummary: false,
  caloriesGoalStatus: false,
  proteinGoalStatus: false,
  currentWeight: false,
  weightTrendline: false,
  projections: false,
  bodyMeasurements: false,
};

export const friendDefaultVisibility: SharingVisibility = {
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

export function getVisibleFieldsForViewer(
  relationship?: Relationship,
): SharingVisibility {
  if (!relationship || relationship.status !== "accepted")
    return privateVisibility;
  return relationship.visibility;
}

export function getLeaderboardVisibility(
  profile?: Pick<UserProfile, "leaderboardVisible">,
) {
  return profile?.leaderboardVisible ?? true;
}

export function canAccessApp(
  profile?: Pick<UserProfile, "status" | "role">,
): boolean {
  if (!profile) return false;
  if (profile.status === "suspended") return false;
  if (profile.role === "admin" || profile.role === "super_admin") return true;
  return profile.status === "approved";
}

export function canAccessAdmin(
  profile?: Pick<UserProfile, "status" | "role">,
): boolean {
  return Boolean(
    profile &&
    profile.status === "approved" &&
    (profile.role === "admin" || profile.role === "super_admin"),
  );
}

export function canManageAdmins(
  profile?: Pick<UserProfile, "status" | "role">,
): boolean {
  return Boolean(
    profile && profile.status === "approved" && profile.role === "super_admin",
  );
}
