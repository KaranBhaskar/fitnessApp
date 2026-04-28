import type {
  AppState,
  MeasurementEntry,
  NutritionLog,
  WorkoutLog,
} from "../types";
import { defaultWorkoutPlan } from "./defaultPlan";
import { addDays, todayKey } from "../lib/date";
import { friendDefaultVisibility } from "../lib/privacy";

const today = todayKey();

function measurement(
  id: string,
  daysAgo: number,
  weightKg: number,
  waistCm: number,
): MeasurementEntry {
  return {
    id,
    userId: "user-karan",
    date: addDays(today, -daysAgo),
    weightKg,
    heightCm: 175,
    neckCm: 37,
    waistCm,
    hipCm: 94,
  };
}

function nutrition(
  id: string,
  daysAgo: number,
  calories: number,
  proteinGrams: number,
): NutritionLog {
  return {
    id,
    userId: "user-karan",
    date: addDays(today, -daysAgo),
    calories,
    proteinGrams,
  };
}

function workout(
  id: string,
  daysAgo: number,
  status: WorkoutLog["status"],
  workoutDayId: string,
): WorkoutLog {
  return {
    id,
    userId: "user-karan",
    date: addDays(today, -daysAgo),
    workoutDayId,
    status,
    sets: [
      {
        id: `${id}-set-1`,
        exerciseName: "Barbell bench / chest press",
        setNumber: 1,
        reps: 5,
        weightKg: 43.3,
        completed: true,
      },
      {
        id: `${id}-set-2`,
        exerciseName: "Barbell bench / chest press",
        setNumber: 2,
        reps: 5,
        weightKg: 43.3,
        completed: true,
      },
      {
        id: `${id}-set-3`,
        exerciseName: "Barbell bench / chest press",
        setNumber: 3,
        reps: 5,
        weightKg: 43.3,
        completed: true,
      },
    ],
  };
}

export const initialDemoState: AppState = {
  appSettings: { mode: "beta" },
  featureFlags: {
    workouts: true,
    nutrition: true,
    measurements: true,
    projections: true,
    friends: true,
    emojiReactions: true,
    calorieStreaks: true,
    proteinStreaks: true,
    onboardingRequired: true,
  },
  currentUserId: undefined,
  users: [
    {
      id: "owner",
      email: "owner@example.com",
      name: "Site Owner",
      role: "super_admin",
      status: "approved",
      onboardingComplete: true,
      units: {
        weight: "metric",
        height: "metric",
        neck: "metric",
        waist: "metric",
        hip: "metric",
      },
      age: 17,
      sexForEstimate: "male",
      activityLevel: "moderate",
      goal: "fat_loss_strength",
      createdAt: addDays(today, -14),
      leaderboardVisible: true,
    },
    {
      id: "user-karan",
      email: "karan@example.com",
      name: "Karan",
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
      age: 17,
      sexForEstimate: "male",
      activityLevel: "moderate",
      goal: "fat_loss_strength",
      createdAt: addDays(today, -10),
      leaderboardVisible: true,
    },
    {
      id: "pending-user",
      email: "pending@example.com",
      name: "Pending User",
      role: "user",
      status: "pending",
      onboardingComplete: false,
      units: {
        weight: "metric",
        height: "metric",
        neck: "metric",
        waist: "metric",
        hip: "metric",
      },
      age: 18,
      sexForEstimate: "male",
      activityLevel: "light",
      goal: "fat_loss_strength",
      createdAt: addDays(today, -1),
      leaderboardVisible: true,
    },
    {
      id: "friend-1",
      email: "friend@example.com",
      name: "Friend",
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
      age: 35,
      sexForEstimate: "female",
      activityLevel: "light",
      goal: "wellness",
      createdAt: addDays(today, -8),
      leaderboardVisible: true,
    },
  ],
  measurements: [
    measurement("m-8", 8, 75.5, 86.4),
    measurement("m-7", 7, 75.2, 86.0),
    measurement("m-5", 5, 75.0, 85.5),
    measurement("m-3", 3, 74.6, 85.0),
    measurement("m-1", 1, 74.3, 84.4),
    measurement("m-0", 0, 74.2, 84.0),
  ],
  nutritionLogs: [
    nutrition("n-6", 6, 2140, 126),
    nutrition("n-5", 5, 2090, 132),
    nutrition("n-4", 4, 2160, 125),
    nutrition("n-3", 3, 2050, 129),
    nutrition("n-2", 2, 2110, 135),
    nutrition("n-1", 1, 2080, 130),
    nutrition("n-0", 0, 2065, 132),
  ],
  workoutPlan: defaultWorkoutPlan,
  workoutPlanTemplates: [
    {
      id: "plan-default",
      name: "Default weekly plan",
      days: defaultWorkoutPlan,
      createdAt: new Date().toISOString(),
    },
  ],
  activeWorkoutPlanId: "plan-default",
  workoutLogs: [
    workout("w-5", 5, "completed", "monday-upper-strength"),
    workout("w-4", 4, "completed", "tuesday-lower-core"),
    workout("w-3", 3, "completed", "wednesday-cardio"),
    workout("w-2", 2, "completed", "thursday-upper-volume"),
    workout("w-1", 1, "completed", "friday-lower-posterior"),
    workout("w-0", 0, "completed", "saturday-cardio-abs"),
  ],
  relationships: [
    {
      id: "rel-friend",
      requesterId: "user-karan",
      recipientId: "pending-user",
      status: "pending",
      tier: "friend",
      visibility: friendDefaultVisibility,
    },
    {
      id: "rel-friend-2",
      requesterId: "user-karan",
      recipientId: "friend-1",
      status: "accepted",
      tier: "friend",
      visibility: friendDefaultVisibility,
    },
  ],
  reactions: [
    {
      id: "react-1",
      fromUserId: "friend-1",
      toUserId: "user-karan",
      targetDate: today,
      emoji: "🔥",
      createdAt: new Date().toISOString(),
    },
  ],
  auditEvents: [
    {
      id: "audit-1",
      actorId: "owner",
      targetUserId: "user-karan",
      action: "view_user_detail",
      createdAt: new Date().toISOString(),
      metadata: { reason: "Demo audit event" },
    },
  ],
  usageEvents: [
    {
      id: "usage-1",
      userId: "user-karan",
      feature: "dashboard",
      createdAt: new Date().toISOString(),
    },
    {
      id: "usage-2",
      userId: "user-karan",
      feature: "projections",
      createdAt: new Date().toISOString(),
    },
    {
      id: "usage-3",
      userId: "user-karan",
      feature: "workouts",
      createdAt: new Date().toISOString(),
    },
  ],
};
