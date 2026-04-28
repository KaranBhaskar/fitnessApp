import { makeFunctionReference } from "convex/server";
import type { LeaderboardRow } from "../../lib/leaderboard";
import type {
  ActivityLevel,
  AppMode,
  FeatureFlags,
  GoalType,
  SexForEstimate,
  SetLog,
  SharingVisibility,
  UnitPreferences,
  UserRole,
  UserStatus,
  WorkoutLog,
} from "../../types";

export const viewerRef = makeFunctionReference<
  "query",
  Record<string, never>,
  { userId: string; profile?: Record<string, unknown> }
>("profiles:viewer");

export const ensureProfileRef = makeFunctionReference<
  "mutation",
  Record<string, never>,
  Record<string, unknown> | null
>("profiles:ensureProfile");

export const authConfigurationRef = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    hasGoogleClientId: boolean;
    hasGoogleClientSecret: boolean;
    hasSiteUrl: boolean;
    hasOwnerAllowlist: boolean;
  }
>("profiles:authConfiguration");

export const dashboardSummaryRef = makeFunctionReference<
  "query",
  Record<string, never>,
  Record<string, unknown>
>("dashboard:summary");

export const adminOverviewRef = makeFunctionReference<
  "query",
  Record<string, never>,
  Record<string, unknown>
>("admin:overview");

export const adminUserDetailRef = makeFunctionReference<
  "mutation",
  { targetUserId: string },
  Record<string, unknown>
>("admin:userDetail");

export const completeOnboardingRef = makeFunctionReference<
  "mutation",
  {
    age: number;
    sexForEstimate: SexForEstimate;
    activityLevel: ActivityLevel;
    weightKg: number;
    heightCm: number;
    neckCm: number;
    waistCm: number;
    hipCm?: number;
  },
  null
>("profiles:completeOnboarding");

export const updateProfileSettingsRef = makeFunctionReference<
  "mutation",
  {
    age?: number;
    activityLevel?: ActivityLevel;
    goal?: GoalType;
    units?: UnitPreferences;
    leaderboardVisible?: boolean;
    activeWorkoutPlanId?: string;
  },
  null
>("profiles:updateSettings");

export const upsertMeasurementRef = makeFunctionReference<
  "mutation",
  {
    date: string;
    weightKg: number;
    heightCm: number;
    neckCm: number;
    waistCm: number;
    hipCm?: number;
    confirmedLargeChange?: boolean;
  },
  null
>("measurements:upsert");

export const upsertNutritionRef = makeFunctionReference<
  "mutation",
  {
    date: string;
    calories: number;
    proteinGrams: number;
  },
  null
>("nutrition:upsert");

export const logWorkoutRef = makeFunctionReference<
  "mutation",
  {
    date: string;
    planDayId?: string;
    status: WorkoutLog["status"];
    notes?: string;
    sets: Array<Omit<SetLog, "id">>;
  },
  null
>("workouts:logWorkout");

export const createWorkoutPlanRef = makeFunctionReference<
  "mutation",
  {
    name: string;
    days: Array<{
      dayName: string;
      focus: string;
      order: number;
      isRestDay: boolean;
      exercises: Array<{
        name: string;
        sets: number;
        minReps?: number;
        maxReps?: number;
        durationSeconds?: number;
        incrementKg?: number;
        category: string;
        order: number;
      }>;
    }>;
  },
  string
>("workouts:createPlan");

export const updateWorkoutPlanRef = makeFunctionReference<
  "mutation",
  {
    planId: string;
    name: string;
    days: Array<{
      dayName: string;
      focus: string;
      order: number;
      isRestDay: boolean;
      exercises: Array<{
        name: string;
        sets: number;
        minReps?: number;
        maxReps?: number;
        durationSeconds?: number;
        incrementKg?: number;
        category: string;
        order: number;
      }>;
    }>;
  },
  null
>("workouts:updatePlan");

export const leaderboardRef = makeFunctionReference<
  "query",
  Record<string, never>,
  LeaderboardRow[]
>("social:leaderboard");

export const friendDetailRef = makeFunctionReference<
  "query",
  { targetUserId: string },
  Record<string, unknown> | null
>("social:friendDetail");

export const requestFriendRef = makeFunctionReference<
  "mutation",
  { recipientId: string },
  null
>("social:requestFriend");

export const acceptFriendRef = makeFunctionReference<
  "mutation",
  { requesterId: string },
  null
>("social:acceptFriend");

export const requestEmailInviteRef = makeFunctionReference<
  "mutation",
  { email: string; note?: string },
  null
>("social:requestEmailInvite");

export const setVisibilityRef = makeFunctionReference<
  "mutation",
  { relationshipId: string; visibility: SharingVisibility },
  null
>("social:setVisibility");

export const setUserStatusRef = makeFunctionReference<
  "mutation",
  { targetUserId: string; status: UserStatus },
  null
>("admin:setUserStatus");

export const setUserRoleRef = makeFunctionReference<
  "mutation",
  { targetUserId: string; role: Exclude<UserRole, "super_admin"> },
  null
>("admin:setUserRole");

export const setAppModeRef = makeFunctionReference<
  "mutation",
  { mode: AppMode },
  null
>("admin:setAppMode");

export const setFeatureFlagRef = makeFunctionReference<
  "mutation",
  { key: keyof FeatureFlags; enabled: boolean },
  null
>("admin:setFeatureFlag");
