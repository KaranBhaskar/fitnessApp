import { ArrowLeft } from "lucide-react";
import { useQuery } from "convex/react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { friendDetailRef } from "../backend/convexRefs";
import {
  calculateBodyComposition,
  calculateCalorieTarget,
  calculateProteinTarget,
} from "../../lib/calculations";
import { todayKey } from "../../lib/date";
import { calculateStreakSummary } from "../../lib/streaks";
import { calculateWeightProjection } from "../../lib/projections";
import type { SharingVisibility } from "../../types";
import { FriendStreakPanel } from "../components/friend/FriendStreakPanel";
import { FriendWeightPanel } from "../components/friend/FriendWeightPanel";
import { FriendTrendPanel } from "../components/friend/FriendTrendPanel";
import { FriendProjectionPanel } from "../components/friend/FriendProjectionPanel";
import { FriendWorkoutsPanel } from "../components/friend/FriendWorkoutsPanel";
import { FriendNutritionPanel } from "../components/friend/FriendNutritionPanel";
import { FriendMeasurementsPanel } from "../components/friend/FriendMeasurementsPanel";
import type {
  MeasurementEntry,
  NutritionLog,
  Relationship,
  UserProfile,
  WorkoutLog,
} from "../../types";

type FriendField = keyof SharingVisibility;

export function FriendDetailPage() {
  const { authMode } = useApp();
  if (authMode === "convex") return <ConvexFriendDetailPage />;
  return <LocalFriendDetailPage />;
}

function LocalFriendDetailPage() {
  const { currentUser, state } = useApp();
  const { friendId } = useParams();
  const viewer = currentUser!;
  const friend = friendId
    ? state.users.find((candidate) => candidate.id === friendId)
    : undefined;

  const relationship =
    friend && friend.id !== viewer.id
      ? state.relationships.find(
          (candidate) =>
            candidate.status === "accepted" &&
            [candidate.requesterId, candidate.recipientId].includes(viewer.id) &&
            [candidate.requesterId, candidate.recipientId].includes(friend.id),
        )
      : undefined;

  const isAllowed = Boolean(friend && (friend.id === viewer.id || relationship));
  if (!friend) return <Navigate to="/leaderboard" replace />;
  if (!isAllowed) return <Navigate to="/leaderboard" replace />;

  return (
    <FriendDetailSurface
      viewer={viewer}
      friend={friend}
      relationship={relationship}
      measurements={state.measurements.filter((entry) => entry.userId === friend.id)}
      nutrition={state.nutritionLogs.filter((entry) => entry.userId === friend.id)}
      workouts={state.workoutLogs.filter((entry) => entry.userId === friend.id)}
    />
  );
}

function ConvexFriendDetailPage() {
  const { currentUser } = useApp();
  const { friendId } = useParams();
  const detail = useQuery(
    friendDetailRef,
    friendId ? { targetUserId: friendId } : "skip",
  );

  if (!friendId) return <Navigate to="/leaderboard" replace />;
  if (detail === undefined) {
    return (
      <div className="rounded-3xl border border-plum/10 bg-white p-5 text-sm font-black text-plum dark:border-white/10 dark:bg-white/10 dark:text-cream">
        Loading friend
      </div>
    );
  }
  if (!detail) return <Navigate to="/leaderboard" replace />;

  const friend = userFromFriendDetail(friendId, detail.profile);
  const relationship = relationshipFromFriendDetail(detail.relationship);
  return (
    <FriendDetailSurface
      viewer={currentUser!}
      friend={friend}
      relationship={relationship}
      measurements={asArray(detail.measurements).map(measurementFromFriendDetail)}
      nutrition={asArray(detail.nutrition).map(nutritionFromFriendDetail)}
      workouts={asArray(detail.workouts).map(workoutFromFriendDetail)}
    />
  );
}

function FriendDetailSurface({
  viewer,
  friend,
  relationship,
  measurements,
  nutrition,
  workouts,
}: {
  viewer: UserProfile;
  friend: UserProfile;
  relationship?: Relationship;
  measurements: MeasurementEntry[];
  nutrition: NutritionLog[];
  workouts: WorkoutLog[];
}) {
  const canView = (field: FriendField) =>
    friend.id === viewer.id ||
    field === "streakStatus" ||
    Boolean(relationship?.visibility[field]);

  const sortedMeasurements = measurements
    .sort((a, b) => a.date.localeCompare(b.date));
  const sortedNutrition = nutrition
    .sort((a, b) => b.date.localeCompare(a.date));
  const sortedWorkouts = workouts
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestMeasurement = sortedMeasurements.at(-1);
  const latestNutrition = sortedNutrition.at(0);
  const today = todayKey();

  const derived = latestMeasurement
    ? (() => {
        const body = calculateBodyComposition(latestMeasurement, friend.sexForEstimate);
        const calories = calculateCalorieTarget({
          sex: friend.sexForEstimate,
          weightKg: latestMeasurement.weightKg,
          heightCm: latestMeasurement.heightCm,
          age: friend.age,
          activityLevel: friend.activityLevel,
        });
        return {
          body,
          calories,
          proteinTarget: calculateProteinTarget(latestMeasurement.weightKg),
          streaks: calculateStreakSummary({
            todayDateKey: today,
            workoutLogs: sortedWorkouts,
            nutritionLogs: sortedNutrition,
            calorieTarget: calories,
            weightKg: latestMeasurement.weightKg,
          }),
          projection: calculateWeightProjection(sortedMeasurements, today),
        };
      })()
    : undefined;

  return (
    <div className="space-y-4">
      <Link
        to="/leaderboard"
        className="inline-flex items-center gap-2 text-sm font-black text-plum dark:text-honey"
      >
        <ArrowLeft size={16} /> Back to leaderboard
      </Link>

      <FriendStreakPanel friend={friend} derived={derived} />

      <FriendWeightPanel
        canView={canView("currentWeight")}
        latestMeasurement={latestMeasurement}
        friend={friend}
        derived={derived}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <FriendTrendPanel
          canView={canView("weightTrendline")}
          derived={derived}
          friend={friend}
        />
        <FriendProjectionPanel
          canView={canView("projections")}
          derived={derived}
          friend={friend}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FriendWorkoutsPanel
          canView={canView("workoutSummary")}
          workouts={sortedWorkouts}
        />
        <FriendNutritionPanel
          canViewCalories={canView("caloriesGoalStatus")}
          canViewProtein={canView("proteinGoalStatus")}
          latestNutrition={latestNutrition}
          nutrition={sortedNutrition}
        />
      </div>

      <FriendMeasurementsPanel
        canView={canView("bodyMeasurements")}
        measurements={sortedMeasurements}
        friend={friend}
      />
    </div>
  );
}

function userFromFriendDetail(userId: string, raw: unknown): UserProfile {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record.userId ?? userId),
    email: String(record.email ?? ""),
    name: String(record.name ?? record.email ?? "Fitness user"),
    role:
      record.role === "super_admin" || record.role === "admin"
        ? record.role
        : "user",
    status:
      record.status === "approved" || record.status === "suspended"
        ? record.status
        : "pending",
    onboardingComplete: Boolean(record.onboardingComplete),
    units: {
      weight: "metric",
      height: "metric",
      neck: "metric",
      waist: "metric",
      hip: "metric",
      ...(typeof record.units === "object" && record.units
        ? record.units
        : {}),
    } as UserProfile["units"],
    age: Number(record.age ?? 18),
    sexForEstimate: record.sexForEstimate === "female" ? "female" : "male",
    activityLevel:
      record.activityLevel === "sedentary" ||
      record.activityLevel === "light" ||
      record.activityLevel === "active" ||
      record.activityLevel === "athlete"
        ? record.activityLevel
        : "moderate",
    goal:
      record.goal === "strength" || record.goal === "wellness"
        ? record.goal
        : "fat_loss_strength",
    createdAt: new Date(Number(record.createdAt ?? Date.now())).toISOString(),
    leaderboardVisible: record.leaderboardVisible !== false,
    activeWorkoutPlanId:
      record.activeWorkoutPlanId === undefined
        ? undefined
        : String(record.activeWorkoutPlanId),
  };
}

function relationshipFromFriendDetail(raw: unknown): Relationship | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    requesterId: String(record.requesterId ?? ""),
    recipientId: String(record.recipientId ?? ""),
    tier: "friend",
    status:
      record.status === "accepted" || record.status === "blocked"
        ? record.status
        : "pending",
    visibility: visibilityFromFriendDetail(record.visibility),
  };
}

function visibilityFromFriendDetail(raw: unknown): SharingVisibility {
  const record = asRecord(raw) ?? {};
  return {
    streakStatus: Boolean(record.streakStatus ?? true),
    streakLength: Boolean(record.streakLength ?? true),
    workoutSummary: Boolean(record.workoutSummary ?? true),
    caloriesGoalStatus: Boolean(record.caloriesGoalStatus ?? true),
    proteinGoalStatus: Boolean(record.proteinGoalStatus ?? true),
    currentWeight: Boolean(record.currentWeight ?? true),
    weightTrendline: Boolean(record.weightTrendline ?? true),
    projections: Boolean(record.projections ?? true),
    bodyMeasurements: Boolean(record.bodyMeasurements ?? true),
  };
}

function measurementFromFriendDetail(raw: unknown): MeasurementEntry {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? todayKey()),
    weightKg: Number(record.weightKg ?? 0),
    heightCm: Number(record.heightCm ?? 0),
    neckCm: Number(record.neckCm ?? 0),
    waistCm: Number(record.waistCm ?? 0),
    hipCm: record.hipCm === undefined ? undefined : Number(record.hipCm),
  };
}

function nutritionFromFriendDetail(raw: unknown): NutritionLog {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? todayKey()),
    calories: Number(record.calories ?? 0),
    proteinGrams: Number(record.proteinGrams ?? 0),
  };
}

function workoutFromFriendDetail(raw: unknown): WorkoutLog {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? todayKey()),
    workoutDayId: String(record.workoutDayId ?? record.planDayId ?? ""),
    status:
      record.status === "rest" || record.status === "partial"
        ? record.status
        : "completed",
    notes: typeof record.notes === "string" ? record.notes : undefined,
    sets: asArray(record.sets).map((item) => {
      const set = asRecord(item) ?? {};
      return {
        id: String(set._id ?? set.id ?? crypto.randomUUID()),
        exerciseName: String(set.exerciseName ?? ""),
        setNumber: Number(set.setNumber ?? 1),
        reps: set.reps === undefined ? undefined : Number(set.reps),
        weightKg: set.weightKg === undefined ? undefined : Number(set.weightKg),
        durationSeconds:
          set.durationSeconds === undefined
            ? undefined
            : Number(set.durationSeconds),
        completed: Boolean(set.completed),
      };
    }),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
