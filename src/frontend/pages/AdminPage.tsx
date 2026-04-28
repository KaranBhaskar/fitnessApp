import { Bell, Check, Lock, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useApp } from "../app/AppContext";
import { MetricCard } from "../components/ui";
import { AdminControls } from "../components/admin/AdminControls";
import { UserList } from "../components/admin/UserList";
import { adminOverviewRef, adminUserDetailRef } from "../backend/convexRefs";
import type {
  AppState,
  AuditEvent,
  FeatureFlags,
  MeasurementEntry,
  NutritionLog,
  UsageEvent,
  UserProfile,
  WorkoutLog,
} from "../../types";

export function AdminPage() {
  const { authMode } = useApp();
  if (authMode === "convex") return <ConvexAdminPage />;
  return <LocalAdminPage />;
}

function LocalAdminPage() {
  const { state, currentUser, updateState } = useApp();
  return (
    <AdminSurface
      state={state}
      currentUser={currentUser!}
      updateState={updateState}
      logLocalViews
    />
  );
}

function ConvexAdminPage() {
  const { currentUser } = useApp();
  const overview = useQuery(adminOverviewRef);
  const loadUserDetail = useMutation(adminUserDetailRef);
  const [state, setState] = useState<AppState>(() => emptyAdminState(currentUser));
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const overviewState = useMemo(
    () => (overview ? stateFromAdminOverview(overview, currentUser) : undefined),
    [currentUser, overview],
  );

  useEffect(() => {
    if (!overviewState) return;
    setState((current) => ({
      ...overviewState,
      currentUserId: currentUser?.id,
      measurements: current.measurements,
      nutritionLogs: current.nutritionLogs,
      workoutLogs: current.workoutLogs,
    }));
    setSelectedUserId((current) => current ?? overviewState.users[0]?.id);
  }, [currentUser?.id, overviewState]);

  useEffect(() => {
    if (!selectedUserId) return;
    void loadUserDetail({ targetUserId: selectedUserId }).then((detail) => {
      setState((current) => ({
        ...current,
        measurements: asArray(detail.measurements).map(measurementFromAdmin),
        nutritionLogs: asArray(detail.nutrition).map(nutritionFromAdmin),
        workoutLogs: asArray(detail.workouts).map(workoutFromAdmin),
      }));
    });
  }, [loadUserDetail, selectedUserId]);

  if (!overview) {
    return (
      <div className="rounded-3xl border border-plum/10 bg-white p-5 text-sm font-black text-plum dark:border-white/10 dark:bg-white/10 dark:text-cream">
        Loading admin data
      </div>
    );
  }

  return (
    <AdminSurface
      state={state}
      currentUser={currentUser!}
      updateState={(updater) => setState((current) => updater(current))}
      selectedUserId={selectedUserId}
      onSelectUser={setSelectedUserId}
    />
  );
}

function AdminSurface({
  state,
  currentUser,
  updateState,
  selectedUserId: controlledSelectedUserId,
  onSelectUser,
  logLocalViews = false,
}: {
  state: AppState;
  currentUser: UserProfile;
  updateState: (updater: (current: AppState) => AppState) => void;
  selectedUserId?: string;
  onSelectUser?: (id: string) => void;
  logLocalViews?: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState(
    state.users.find((user) => user.role === "user")?.id ?? state.users[0]?.id,
  );
  const activeSelectedUserId = controlledSelectedUserId ?? selectedUserId;
  const setActiveSelectedUserId = onSelectUser ?? setSelectedUserId;
  const selectedUser =
    state.users.find((user) => user.id === activeSelectedUserId) ?? state.users[0];
  const selectedMeasurements = state.measurements.filter(
    (entry) => entry.userId === selectedUser?.id,
  );
  const selectedNutrition = state.nutritionLogs.filter(
    (entry) => entry.userId === selectedUser?.id,
  );
  const selectedWorkouts = state.workoutLogs.filter(
    (entry) => entry.userId === selectedUser?.id,
  );

  useEffect(() => {
    if (!logLocalViews || !selectedUser) return;
    updateState((current) => ({
      ...current,
      auditEvents: [
        {
          id: crypto.randomUUID(),
          actorId: currentUser.id,
          targetUserId: selectedUser.id,
          action: "view_user_detail",
          createdAt: new Date().toISOString(),
          metadata: { surface: "admin_page" },
        },
        ...current.auditEvents,
      ].slice(0, 50),
    }));
  }, [currentUser.id, logLocalViews, selectedUser?.id]);

  const counts = {
    total: state.users.length,
    pending: state.users.filter((u) => u.status === "pending").length,
    approved: state.users.filter((u) => u.status === "approved").length,
    suspended: state.users.filter((u) => u.status === "suspended").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Total users" value={`${counts.total}`} accent="peach" />
        <MetricCard icon={Bell} label="Pending" value={`${counts.pending}`} accent="honey" />
        <MetricCard icon={Check} label="Approved" value={`${counts.approved}`} accent="rose" />
        <MetricCard icon={Lock} label="Suspended" value={`${counts.suspended}`} accent="peach" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminControls
          state={state}
          currentUser={currentUser}
          updateState={updateState}
        />
        {selectedUser ? (
          <UserList
            users={state.users}
            selectedUserId={activeSelectedUserId}
            selectedUser={selectedUser}
            measurements={selectedMeasurements}
            nutrition={selectedNutrition}
            workouts={selectedWorkouts}
            currentUser={currentUser}
            updateState={updateState}
            onSelect={setActiveSelectedUserId}
          />
        ) : (
          <div className="rounded-3xl border border-plum/10 bg-white p-5 text-sm font-black text-plum dark:border-white/10 dark:bg-white/10 dark:text-cream">
            No users yet
          </div>
        )}
      </div>
    </div>
  );
}

const defaultFeatureFlags: FeatureFlags = {
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

function emptyAdminState(currentUser?: UserProfile): AppState {
  return {
    appSettings: { mode: "beta" },
    featureFlags: defaultFeatureFlags,
    users: currentUser ? [currentUser] : [],
    currentUserId: currentUser?.id,
    measurements: [],
    nutritionLogs: [],
    workoutPlan: [],
    workoutPlanTemplates: [],
    activeWorkoutPlanId: undefined,
    workoutLogs: [],
    relationships: [],
    reactions: [],
    auditEvents: [],
    usageEvents: [],
  };
}

function stateFromAdminOverview(raw: unknown, currentUser?: UserProfile): AppState {
  const record = asRecord(raw) ?? {};
  const users = asArray(record.users).map(userFromAdmin);
  const mergedUsers =
    currentUser && !users.some((user) => user.id === currentUser.id)
      ? [currentUser, ...users]
      : users;
  const featureFlags = { ...defaultFeatureFlags };
  for (const flag of asArray(record.flags)) {
    const flagRecord = asRecord(flag);
    const key = String(flagRecord?.key ?? "") as keyof FeatureFlags;
    if (key in featureFlags) featureFlags[key] = Boolean(flagRecord?.enabled);
  }
  return {
    ...emptyAdminState(currentUser),
    appSettings: { mode: record.mode === "open" ? "open" : "beta" },
    featureFlags,
    users: mergedUsers,
    auditEvents: asArray(record.audits).map(auditFromAdmin),
    usageEvents: asArray(record.usage).map(usageFromAdmin),
  };
}

function userFromAdmin(raw: unknown): UserProfile {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record.userId ?? record.id ?? record._id ?? ""),
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

function measurementFromAdmin(raw: unknown): MeasurementEntry {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? ""),
    weightKg: Number(record.weightKg ?? 0),
    heightCm: Number(record.heightCm ?? 0),
    neckCm: Number(record.neckCm ?? 0),
    waistCm: Number(record.waistCm ?? 0),
    hipCm: record.hipCm === undefined ? undefined : Number(record.hipCm),
  };
}

function nutritionFromAdmin(raw: unknown): NutritionLog {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? ""),
    calories: Number(record.calories ?? 0),
    proteinGrams: Number(record.proteinGrams ?? 0),
  };
}

function workoutFromAdmin(raw: unknown): WorkoutLog {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    date: String(record.date ?? ""),
    workoutDayId: String(record.planDayId ?? record.workoutDayId ?? ""),
    status:
      record.status === "rest" || record.status === "partial"
        ? record.status
        : "completed",
    sets: [],
    notes: typeof record.notes === "string" ? record.notes : undefined,
  };
}

function auditFromAdmin(raw: unknown): AuditEvent {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    actorId: String(record.actorId ?? ""),
    targetUserId:
      record.targetUserId === undefined ? undefined : String(record.targetUserId),
    action: String(record.action ?? ""),
    createdAt: new Date(Number(record.createdAt ?? Date.now())).toISOString(),
    metadata:
      typeof record.metadata === "object" && record.metadata
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  };
}

function usageFromAdmin(raw: unknown): UsageEvent {
  const record = asRecord(raw) ?? {};
  return {
    id: String(record._id ?? record.id ?? crypto.randomUUID()),
    userId: String(record.userId ?? ""),
    feature: String(record.feature ?? ""),
    createdAt: new Date(Number(record.createdAt ?? Date.now())).toISOString(),
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
