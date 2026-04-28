import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useMutation } from "convex/react";
import type {
  ActivityLevel,
  AppMode,
  FeatureFlags,
  GoalType,
  MeasurementEntry,
  NutritionLog,
  SetLog,
  SharingVisibility,
  UnitPreferences,
  UserRole,
  UserStatus,
  WorkoutDay,
  WorkoutLog,
} from "../../types";
import type { AuthMode } from "../app/AppContext";
import {
  completeOnboardingRef,
  createWorkoutPlanRef,
  logWorkoutRef,
  setAppModeRef,
  setFeatureFlagRef,
  setUserRoleRef,
  setUserStatusRef,
  setVisibilityRef,
  updateProfileSettingsRef,
  updateWorkoutPlanRef,
  upsertMeasurementRef,
  upsertNutritionRef,
} from "./convexRefs";

type CompleteOnboardingInput = {
  age: number;
  sexForEstimate: "male" | "female";
  activityLevel: ActivityLevel;
  weightKg: number;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
};

type ProfileSettingsInput = {
  age?: number;
  activityLevel?: ActivityLevel;
  goal?: GoalType;
  units?: UnitPreferences;
  leaderboardVisible?: boolean;
  activeWorkoutPlanId?: string;
};

type WorkoutLogInput = {
  date: string;
  planDayId?: string;
  status: WorkoutLog["status"];
  notes?: string;
  sets: Array<Omit<SetLog, "id">>;
};

interface BackendActions {
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  updateProfileSettings: (input: ProfileSettingsInput) => Promise<void>;
  saveMeasurement: (
    input: Omit<MeasurementEntry, "id" | "userId"> & {
      confirmedLargeChange?: boolean;
    },
  ) => Promise<void>;
  saveNutrition: (
    input: Pick<NutritionLog, "date" | "calories" | "proteinGrams">,
  ) => Promise<void>;
  saveWorkoutLog: (input: WorkoutLogInput) => Promise<void>;
  createWorkoutPlan: (
    name: string,
    days: WorkoutDay[],
  ) => Promise<string | undefined>;
  updateWorkoutPlan: (
    planId: string,
    name: string,
    days: WorkoutDay[],
  ) => Promise<void>;
  setFriendVisibility: (
    relationshipId: string,
    visibility: SharingVisibility,
  ) => Promise<void>;
  setUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  setUserRole: (
    userId: string,
    role: Exclude<UserRole, "super_admin">,
  ) => Promise<void>;
  setAppMode: (mode: AppMode) => Promise<void>;
  setFeatureFlag: (key: keyof FeatureFlags, enabled: boolean) => Promise<void>;
}

const noop = async () => undefined;

const localBackendActions: BackendActions = {
  completeOnboarding: noop,
  updateProfileSettings: noop,
  saveMeasurement: noop,
  saveNutrition: noop,
  saveWorkoutLog: noop,
  createWorkoutPlan: noop,
  updateWorkoutPlan: noop,
  setFriendVisibility: noop,
  setUserStatus: noop,
  setUserRole: noop,
  setAppMode: noop,
  setFeatureFlag: noop,
};

const BackendActionsContext =
  createContext<BackendActions>(localBackendActions);

export function BackendActionsProvider({
  authMode,
  children,
}: {
  authMode: AuthMode;
  children: ReactNode;
}) {
  if (authMode === "convex")
    return <ConvexBackendActionsProvider>{children}</ConvexBackendActionsProvider>;
  return (
    <BackendActionsContext.Provider value={localBackendActions}>
      {children}
    </BackendActionsContext.Provider>
  );
}

export function useBackendActions() {
  return useContext(BackendActionsContext);
}

function ConvexBackendActionsProvider({ children }: { children: ReactNode }) {
  const completeOnboarding = useMutation(completeOnboardingRef);
  const updateProfileSettings = useMutation(updateProfileSettingsRef);
  const saveMeasurement = useMutation(upsertMeasurementRef);
  const saveNutrition = useMutation(upsertNutritionRef);
  const saveWorkoutLog = useMutation(logWorkoutRef);
  const createWorkoutPlan = useMutation(createWorkoutPlanRef);
  const updateWorkoutPlan = useMutation(updateWorkoutPlanRef);
  const setFriendVisibility = useMutation(setVisibilityRef);
  const setUserStatus = useMutation(setUserStatusRef);
  const setUserRole = useMutation(setUserRoleRef);
  const setAppMode = useMutation(setAppModeRef);
  const setFeatureFlag = useMutation(setFeatureFlagRef);

  const actions = useMemo<BackendActions>(
    () => ({
      completeOnboarding: async (input) => {
        await completeOnboarding(input);
      },
      updateProfileSettings: async (input) => {
        await updateProfileSettings(input);
      },
      saveMeasurement: async (input) => {
        await saveMeasurement(input);
      },
      saveNutrition: async (input) => {
        await saveNutrition(input);
      },
      saveWorkoutLog: async (input) => {
        await saveWorkoutLog(input);
      },
      createWorkoutPlan: async (name, days) => {
        return await createWorkoutPlan({
          name,
          days: serializeWorkoutDays(days),
        });
      },
      updateWorkoutPlan: async (planId, name, days) => {
        await updateWorkoutPlan({
          planId,
          name,
          days: serializeWorkoutDays(days),
        });
      },
      setFriendVisibility: async (relationshipId, visibility) => {
        await setFriendVisibility({ relationshipId, visibility });
      },
      setUserStatus: async (targetUserId, status) => {
        await setUserStatus({ targetUserId, status });
      },
      setUserRole: async (targetUserId, role) => {
        await setUserRole({ targetUserId, role });
      },
      setAppMode: async (mode) => {
        await setAppMode({ mode });
      },
      setFeatureFlag: async (key, enabled) => {
        await setFeatureFlag({ key, enabled });
      },
    }),
    [
      completeOnboarding,
      createWorkoutPlan,
      saveMeasurement,
      saveNutrition,
      saveWorkoutLog,
      setAppMode,
      setFeatureFlag,
      setFriendVisibility,
      setUserRole,
      setUserStatus,
      updateProfileSettings,
      updateWorkoutPlan,
    ],
  );

  return (
    <BackendActionsContext.Provider value={actions}>
      {children}
    </BackendActionsContext.Provider>
  );
}

function serializeWorkoutDays(days: WorkoutDay[]) {
  return days.map((day, dayIndex) => ({
    dayName: day.dayName,
    focus: day.focus,
    order: dayIndex,
    isRestDay: Boolean(day.isRestDay),
    exercises: day.exercises.map((exercise, exerciseIndex) => ({
      name: exercise.name,
      sets: exercise.sets,
      minReps: exercise.minReps,
      maxReps: exercise.maxReps,
      durationSeconds: exercise.durationSeconds,
      incrementKg: exercise.incrementKg,
      category: exercise.category,
      order: exerciseIndex,
    })),
  }));
}
