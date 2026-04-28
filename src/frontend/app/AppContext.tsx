import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { initialDemoState } from "../../data/demoState";
import {
  dashboardSummaryRef,
  ensureProfileRef,
  viewerRef,
} from "../backend/convexRefs";
import { friendDefaultVisibility } from "../../lib/privacy";
import { BackendActionsProvider } from "../backend/BackendActionsContext";
import {
  calculateBodyComposition,
  calculateCalorieTarget,
  calculateProteinTarget,
} from "../../lib/calculations";
import { todayKey } from "../../lib/date";
import { calculateWeightProjection } from "../../lib/projections";
import { calculateStreakSummary } from "../../lib/streaks";
import type {
  AppState,
  BodyComposition,
  CalorieTarget,
  MeasurementEntry,
  NutritionLog,
  ProjectionSummary,
  Relationship,
  SharingVisibility,
  SetLog,
  StreakSummary,
  UserProfile,
  WorkoutDay,
  WorkoutPlanTemplate,
  WorkoutLog,
} from "../../types";

export type AuthMode = "convex" | "demo";

export type DerivedMetrics = {
  body: BodyComposition;
  calories: CalorieTarget;
  proteinTarget: number;
  streaks: StreakSummary;
  projection: ProjectionSummary;
};

type AuthStatus = {
  loading: boolean;
  authenticated: boolean;
  error?: string;
};

type AppContextValue = {
  authMode: AuthMode;
  authLoading: boolean;
  convexAuthenticated: boolean;
  authError?: string;
  state: AppState;
  updateState: (updater: (current: AppState) => AppState) => void;
  currentUser?: UserProfile;
  activeUser: UserProfile;
  userMeasurements: MeasurementEntry[];
  latestMeasurement?: MeasurementEntry;
  derived?: DerivedMetrics;
  dark: boolean;
  setDark: (dark: boolean) => void;
  signInDemoGoogle: () => void;
  signOut: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);
const today = todayKey();
const fallbackUser = initialDemoState.users.find(
  (user) => user.id === "user-karan",
)!;
const emptyConvexState: AppState = {
  ...initialDemoState,
  currentUserId: undefined,
  users: [],
  measurements: [],
  nutritionLogs: [],
  workoutLogs: [],
  relationships: [],
  reactions: [],
  auditEvents: [],
  usageEvents: [],
};

export function AppProvider({
  authMode,
  children,
}: {
  authMode: AuthMode;
  children: ReactNode;
}) {
  const [state, setState] = useState<AppState>(() =>
    authMode === "convex" ? emptyConvexState : initialDemoState,
  );
  const [dark, setDark] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    loading: authMode === "convex",
    authenticated: false,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const currentUser = state.users.find(
    (user) => user.id === state.currentUserId,
  );
  const activeUser = currentUser ?? state.users[0] ?? fallbackUser;
  const userMeasurements = state.measurements
    .filter((entry) => entry.userId === activeUser.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestMeasurement = userMeasurements.at(-1);
  const userNutrition = state.nutritionLogs.filter(
    (entry) => entry.userId === activeUser.id,
  );
  const userWorkouts = state.workoutLogs.filter(
    (entry) => entry.userId === activeUser.id,
  );

  const derived = useMemo(() => {
    if (!latestMeasurement) return undefined;
    const body = calculateBodyComposition(
      latestMeasurement,
      activeUser.sexForEstimate,
    );
    const calories = calculateCalorieTarget({
      sex: activeUser.sexForEstimate,
      weightKg: latestMeasurement.weightKg,
      heightCm: latestMeasurement.heightCm,
      age: activeUser.age,
      activityLevel: activeUser.activityLevel,
    });
    return {
      body,
      calories,
      proteinTarget: calculateProteinTarget(latestMeasurement.weightKg),
      streaks: calculateStreakSummary({
        todayDateKey: today,
        workoutLogs: userWorkouts,
        nutritionLogs: userNutrition,
        calorieTarget: calories,
        weightKg: latestMeasurement.weightKg,
      }),
      projection: calculateWeightProjection(userMeasurements, today),
    };
  }, [
    activeUser,
    latestMeasurement,
    userMeasurements,
    userNutrition,
    userWorkouts,
  ]);

  function updateState(updater: (current: AppState) => AppState) {
    setState((current) => updater(current));
  }

  function signInDemoGoogle() {
    const demoEmail = (
      import.meta.env.VITE_DEMO_EMAIL as string | undefined
    )?.toLowerCase();
    const requested = demoEmail
      ? state.users.find((user) => user.email.toLowerCase() === demoEmail)
      : undefined;
    const user =
      requested ??
      state.users.find((candidate) => candidate.id === "user-karan")!;
    setState((current) => ({ ...current, currentUserId: user.id }));
  }

  function signOut() {
    setState((current) => ({ ...current, currentUserId: undefined }));
  }

  return (
    <AppContext.Provider
      value={{
        authMode,
        authLoading: authStatus.loading,
        convexAuthenticated: authStatus.authenticated,
        authError: authStatus.error,
        state,
        updateState,
        currentUser,
        activeUser,
        userMeasurements,
        latestMeasurement,
        derived,
        dark,
        setDark,
        signInDemoGoogle,
        signOut,
      }}
    >
      {authMode === "convex" && (
        <ConvexProfileBridge
          setAuthStatus={setAuthStatus}
          setState={setState}
        />
      )}
      <BackendActionsProvider authMode={authMode}>
        {children}
      </BackendActionsProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

function ConvexProfileBridge({
  setAuthStatus,
  setState,
}: {
  setAuthStatus: React.Dispatch<React.SetStateAction<AuthStatus>>;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureAttemptedRef = useRef(false);
  const ensureProfile = useMutation(ensureProfileRef);
  const viewer = useQuery(viewerRef, isAuthenticated ? {} : "skip");
  const viewerProfile = viewer?.profile
    ? profileFromConvex(viewer.userId, viewer.profile)
    : undefined;
  const summary = useQuery(
    dashboardSummaryRef,
    isAuthenticated && viewerProfile?.status === "approved" ? {} : "skip",
  );

  useEffect(() => {
    if (isLoading) {
      setAuthStatus({ loading: true, authenticated: false });
      return;
    }
    if (!isAuthenticated) {
      ensureAttemptedRef.current = false;
      setAuthStatus({ loading: false, authenticated: false });
      setState((current) => ({
        ...current,
        currentUserId: undefined,
        users: [],
      }));
      return;
    }
    setAuthStatus({ loading: true, authenticated: true });
  }, [isAuthenticated, isLoading, setAuthStatus, setState]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (ensureAttemptedRef.current) return;
    ensureAttemptedRef.current = true;
    setAuthStatus({ loading: true, authenticated: true });
    void ensureProfile({}).then((profile) => {
      if (!profile) {
        setAuthStatus({
          loading: false,
          authenticated: true,
          error: "Profile setup returned empty. Please try signing out and signing in again.",
        });
        return;
      }
      const syncedProfile = profileFromConvex(
        String((profile as { userId?: unknown }).userId ?? ""),
        profile,
      );
      setState((current) => ({
        ...current,
        currentUserId: syncedProfile.id,
        users: [syncedProfile],
      }));
      setAuthStatus({ loading: false, authenticated: true });
    }).catch((error: unknown) => {
      setAuthStatus({
        loading: false,
        authenticated: true,
        error:
          error instanceof Error
            ? error.message
            : "Profile setup failed after Google sign-in.",
      });
    });
  }, [
    ensureProfile,
    isAuthenticated,
    isLoading,
    setAuthStatus,
    setState,
  ]);

  useEffect(() => {
    if (!viewer?.userId || !viewer.profile) return;
    const profile = profileFromConvex(viewer.userId, viewer.profile);
    setState((current) => ({
      ...current,
      currentUserId: profile.id,
      users: [profile],
    }));
    setAuthStatus({ loading: false, authenticated: true });
  }, [setAuthStatus, setState, viewer]);

  useEffect(() => {
    if (!viewer?.userId || !summary) return;
    const synced = stateFromDashboardSummary(viewer.userId, summary);
    const activePlan =
      synced.workoutPlanTemplates.find(
        (template) => template.id === synced.profile.activeWorkoutPlanId,
      ) ?? synced.workoutPlanTemplates[0];
    setState((current) => ({
      ...current,
      appSettings: synced.appSettings ?? current.appSettings,
      featureFlags: synced.featureFlags ?? current.featureFlags,
      users: [synced.profile],
      measurements: [
        ...synced.measurements,
        ...current.measurements.filter((entry) => entry.userId !== viewer.userId),
      ],
      nutritionLogs: [
        ...synced.nutritionLogs,
        ...current.nutritionLogs.filter((entry) => entry.userId !== viewer.userId),
      ],
      workoutLogs: [
        ...synced.workoutLogs,
        ...current.workoutLogs.filter((entry) => entry.userId !== viewer.userId),
      ],
      workoutPlanTemplates: synced.workoutPlanTemplates.length
        ? synced.workoutPlanTemplates
        : current.workoutPlanTemplates,
      workoutPlan: activePlan?.days ?? current.workoutPlan,
      activeWorkoutPlanId: activePlan?.id ?? current.activeWorkoutPlanId,
      relationships: synced.relationships,
    }));
  }, [setState, summary, viewer?.userId]);

  return null;
}

function stateFromDashboardSummary(
  userId: string,
  raw: Record<string, unknown>,
) {
  const profile = profileFromConvex(
    userId,
    asRecord(raw.profile) ?? { userId },
  );
  const appSettings = {
    mode: raw.appMode === "open" ? "open" : "beta",
  } as const;
  const featureFlags = { ...initialDemoState.featureFlags };
  for (const flag of asArray(raw.featureFlags)) {
    const record = asRecord(flag);
    const key = String(record?.key ?? "") as keyof typeof featureFlags;
    if (key in featureFlags) featureFlags[key] = Boolean(record?.enabled);
  }

  return {
    profile,
    appSettings,
    featureFlags,
    measurements: asArray(raw.recentMeasurements).map((item) =>
      measurementFromConvex(item),
    ),
    nutritionLogs: asArray(raw.recentNutritionLogs).map((item) =>
      nutritionFromConvex(item),
    ),
    workoutLogs: asArray(raw.recentWorkoutLogs).map((item) =>
      workoutFromConvex(item),
    ),
    workoutPlanTemplates: asArray(raw.workoutPlans).map((item) =>
      workoutPlanFromConvex(item),
    ),
    relationships: asArray(raw.relationships).map((item) =>
      relationshipFromConvex(item),
    ),
  };
}

function profileFromConvex(
  userId: string,
  raw: Record<string, unknown>,
): UserProfile {
  return {
    id: userId,
    email: String(raw.email ?? ""),
    name: String(raw.name ?? raw.email ?? "Fitness user"),
    role:
      raw.role === "super_admin" || raw.role === "admin" ? raw.role : "user",
    status:
      raw.status === "approved" || raw.status === "suspended"
        ? raw.status
        : "pending",
    onboardingComplete: Boolean(raw.onboardingComplete),
    units: {
      weight: "metric",
      height: "metric",
      neck: "metric",
      waist: "metric",
      hip: "metric",
      ...(typeof raw.units === "object" && raw.units ? raw.units : {}),
    } as UserProfile["units"],
    age: Number(raw.age ?? 18),
    sexForEstimate: raw.sexForEstimate === "female" ? "female" : "male",
    activityLevel:
      raw.activityLevel === "sedentary" ||
      raw.activityLevel === "light" ||
      raw.activityLevel === "active" ||
      raw.activityLevel === "athlete"
        ? raw.activityLevel
        : "moderate",
    goal:
      raw.goal === "strength" || raw.goal === "wellness"
        ? raw.goal
        : "fat_loss_strength",
    createdAt: new Date(Number(raw.createdAt ?? Date.now())).toISOString(),
    leaderboardVisible: raw.leaderboardVisible !== false,
    activeWorkoutPlanId:
      raw.activeWorkoutPlanId === undefined
        ? undefined
        : String(raw.activeWorkoutPlanId),
  };
}

function measurementFromConvex(raw: unknown): MeasurementEntry {
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

function nutritionFromConvex(raw: unknown): NutritionLog {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? todayKey()),
    calories: Number(record.calories ?? 0),
    proteinGrams: Number(record.proteinGrams ?? 0),
  };
}

function workoutFromConvex(raw: unknown): WorkoutLog {
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
    sets: asArray(record.sets).map((item) => setLogFromConvex(item)),
  };
}

function workoutPlanFromConvex(raw: unknown): WorkoutPlanTemplate {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record.id ?? record._id ?? crypto.randomUUID()),
    name: String(record.name ?? "Custom plan"),
    createdAt: new Date(Number(record.createdAt ?? Date.now())).toISOString(),
    days: asArray(record.days).map((item) => workoutDayFromConvex(item)),
  };
}

function workoutDayFromConvex(raw: unknown): WorkoutDay {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record.id ?? record._id ?? crypto.randomUUID()),
    dayName: String(record.dayName ?? "Day"),
    focus: String(record.focus ?? "Workout"),
    tags: [],
    isRestDay: Boolean(record.isRestDay),
    exercises: asArray(record.exercises).map((item) => {
      const exercise = asRecord(item) ?? {};
      return {
        id: String(exercise.id ?? exercise._id ?? crypto.randomUUID()),
        name: String(exercise.name ?? "Exercise"),
        sets: Number(exercise.sets ?? 1),
        minReps:
          exercise.minReps === undefined ? undefined : Number(exercise.minReps),
        maxReps:
          exercise.maxReps === undefined ? undefined : Number(exercise.maxReps),
        durationSeconds:
          exercise.durationSeconds === undefined
            ? undefined
            : Number(exercise.durationSeconds),
        incrementKg:
          exercise.incrementKg === undefined
            ? undefined
            : Number(exercise.incrementKg),
        category:
          exercise.category === "bodyweight" ||
          exercise.category === "cardio" ||
          exercise.category === "mobility" ||
          exercise.category === "core" ||
          exercise.category === "rest"
            ? exercise.category
            : "strength",
      };
    }),
  };
}

function setLogFromConvex(raw: unknown): SetLog {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    exerciseName: String(record.exerciseName ?? ""),
    setNumber: Number(record.setNumber ?? 1),
    reps: record.reps === undefined ? undefined : Number(record.reps),
    weightKg:
      record.weightKg === undefined ? undefined : Number(record.weightKg),
    durationSeconds:
      record.durationSeconds === undefined
        ? undefined
        : Number(record.durationSeconds),
    completed: Boolean(record.completed),
  };
}

function relationshipFromConvex(raw: unknown): Relationship {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    requesterId: String(record.requesterId ?? ""),
    recipientId: String(record.recipientId ?? ""),
    tier: "friend",
    status:
      record.status === "accepted" || record.status === "blocked"
        ? record.status
        : "pending",
    visibility: visibilityFromConvex(record.visibility),
  };
}

function visibilityFromConvex(raw: unknown): SharingVisibility {
  const record = asRecord(raw) ?? {};
  return {
    streakStatus: Boolean(record.streakStatus ?? friendDefaultVisibility.streakStatus),
    streakLength: Boolean(record.streakLength ?? friendDefaultVisibility.streakLength),
    workoutSummary: Boolean(record.workoutSummary ?? friendDefaultVisibility.workoutSummary),
    caloriesGoalStatus: Boolean(record.caloriesGoalStatus ?? friendDefaultVisibility.caloriesGoalStatus),
    proteinGoalStatus: Boolean(record.proteinGoalStatus ?? friendDefaultVisibility.proteinGoalStatus),
    currentWeight: Boolean(record.currentWeight ?? friendDefaultVisibility.currentWeight),
    weightTrendline: Boolean(record.weightTrendline ?? friendDefaultVisibility.weightTrendline),
    projections: Boolean(record.projections ?? friendDefaultVisibility.projections),
    bodyMeasurements: Boolean(record.bodyMeasurements ?? friendDefaultVisibility.bodyMeasurements),
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
