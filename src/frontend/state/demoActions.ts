import type {
  AppState,
  MeasurementEntry,
  NutritionLog,
  SetLog,
  UserProfile,
  WorkoutDay,
  WorkoutLog,
} from "../../types";
import { todayKey } from "../../lib/date";
import { lbToKg } from "../../lib/calculations";
import { isWithinRateLimit, rateLimitRules } from "../../lib/rateLimitPolicy";
import { friendDefaultVisibility } from "../../lib/privacy";

type UpdateState = (updater: (current: AppState) => AppState) => void;

function getActivePlanDays(state: AppState): WorkoutDay[] {
  if (!state.workoutPlanTemplates?.length) return state.workoutPlan;
  const activeTemplate = state.workoutPlanTemplates.find(
    (template) => template.id === state.activeWorkoutPlanId,
  );
  return activeTemplate?.days ?? state.workoutPlan;
}

export function completeOnboarding(
  profile: UserProfile & { measurement: MeasurementEntry },
  updateState: UpdateState,
  navigate: (route: "dashboard") => void,
) {
  const { measurement, ...profileWithoutMeasurement } = profile;
  updateState((current) => ({
    ...current,
    users: current.users.map((user) =>
      user.id === profile.id ? profileWithoutMeasurement : user,
    ),
    measurements: [
      measurement,
      ...current.measurements.filter(
        (entry) =>
          !(entry.userId === profile.id && entry.date === measurement.date),
      ),
    ],
  }));
  navigate("dashboard");
}

export function completeWorkoutToday(
  user: UserProfile,
  state: AppState,
  updateState: UpdateState,
  status: WorkoutLog["status"],
  dayId?: string,
) {
  const today = todayKey();
  const activePlan = getActivePlanDays(state);
  const planDay =
    activePlan.find((day) => day.id === dayId) ??
    activePlan[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const newLog: WorkoutLog = {
    id: crypto.randomUUID(),
    userId: user.id,
    date: today,
    workoutDayId: planDay.id,
    status,
    sets:
      status === "rest"
        ? []
        : planDay.exercises.flatMap((exercise) =>
            Array.from({ length: exercise.sets }, (_, index) => ({
              id: crypto.randomUUID(),
              exerciseName: exercise.name,
              setNumber: index + 1,
              reps: exercise.maxReps,
              durationSeconds: exercise.durationSeconds,
              weightKg: exercise.category === "strength" ? 20 : undefined,
              completed: true,
            })),
          ),
  };
  updateState((current) => ({
    ...current,
    workoutLogs: [
      newLog,
      ...current.workoutLogs.filter(
        (log) => !(log.userId === user.id && log.date === today),
      ),
    ],
    usageEvents: [
      {
        id: crypto.randomUUID(),
        userId: user.id,
        feature: "workouts",
        createdAt: new Date().toISOString(),
      },
      ...current.usageEvents,
    ],
  }));
}

export function saveWorkoutLogForDate(
  user: UserProfile,
  state: AppState,
  updateState: UpdateState,
  payload: {
    date: string;
    dayId: string;
    status: WorkoutLog["status"];
    sets: SetLog[];
    notes?: string;
  },
) {
  const newLog: WorkoutLog = {
    id: crypto.randomUUID(),
    userId: user.id,
    date: payload.date,
    workoutDayId: payload.dayId,
    status: payload.status,
    sets: payload.sets,
    notes: payload.notes,
  };
  updateState((current) => ({
    ...current,
    workoutLogs: [
      newLog,
      ...current.workoutLogs.filter(
        (log) => !(log.userId === user.id && log.date === payload.date),
      ),
    ],
    usageEvents: [
      {
        id: crypto.randomUUID(),
        userId: user.id,
        feature: "workouts",
        createdAt: new Date().toISOString(),
      },
      ...current.usageEvents,
    ],
  }));
}

export function latestSetForExercise(
  workouts: WorkoutLog[],
  exerciseName: string,
) {
  const normalizedName = exerciseName.trim().toLowerCase();
  return [...workouts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((workout) => workout.sets)
    .find(
      (set) =>
        set.exerciseName.trim().toLowerCase() === normalizedName &&
        set.completed,
    );
}

export function saveNutrition(
  userId: string,
  date: string,
  calories: number,
  proteinGrams: number,
  updateState: UpdateState,
) {
  const newLog: NutritionLog = {
    id: crypto.randomUUID(),
    userId,
    date,
    calories,
    proteinGrams,
  };
  updateState((current) => ({
    ...current,
    nutritionLogs: [
      newLog,
      ...current.nutritionLogs.filter(
        (log) => !(log.userId === userId && log.date === date),
      ),
    ],
    usageEvents: [
      {
        id: crypto.randomUUID(),
        userId,
        feature: "nutrition",
        createdAt: new Date().toISOString(),
      },
      ...current.usageEvents,
    ],
  }));
}

export function saveMeasurement(
  user: UserProfile,
  values: {
    date: string;
    weight: number;
    height: number;
    neck: number;
    waist: number;
    hip: number;
  },
  updateState: UpdateState,
) {
  const entry = createMeasurementEntry(user, values);
  updateState((current) => ({
    ...current,
    measurements: [
      entry,
      ...current.measurements.filter(
        (measurement) =>
          !(measurement.userId === user.id && measurement.date === values.date),
      ),
    ],
    usageEvents: [
      {
        id: crypto.randomUUID(),
        userId: user.id,
        feature: "measurements",
        createdAt: new Date().toISOString(),
      },
      ...current.usageEvents,
    ],
  }));
}

export function createMeasurementEntry(
  user: UserProfile,
  values: {
    date: string;
    weight: number;
    height: number;
    neck: number;
    waist: number;
    hip: number;
  },
): MeasurementEntry {
  return {
    id: crypto.randomUUID(),
    userId: user.id,
    date: values.date,
    weightKg:
      user.units.weight === "us" ? lbToKg(values.weight) : values.weight,
    heightCm: user.units.height === "us" ? values.height * 2.54 : values.height,
    neckCm: user.units.neck === "us" ? values.neck * 2.54 : values.neck,
    waistCm: user.units.waist === "us" ? values.waist * 2.54 : values.waist,
    hipCm: user.units.hip === "us" ? values.hip * 2.54 : values.hip,
  };
}

export function sendFriendRequest(
  requesterId: string,
  recipientId: string,
  updateState: UpdateState,
) {
  updateState((current) => {
    const timestamps = current.usageEvents
      .filter(
        (event) =>
          event.userId === requesterId && event.feature === "friendRequest",
      )
      .map((event) => new Date(event.createdAt).getTime());
    if (!isWithinRateLimit(timestamps, rateLimitRules.friendRequest).ok)
      return current;
    const exists = current.relationships.some(
      (relationship) =>
        [relationship.requesterId, relationship.recipientId].includes(
          requesterId,
        ) &&
        [relationship.requesterId, relationship.recipientId].includes(
          recipientId,
        ),
    );
    if (exists || requesterId === recipientId) return current;
    return {
      ...current,
      relationships: [
        {
          id: crypto.randomUUID(),
          requesterId,
          recipientId,
          tier: "friend",
          status: "pending",
          visibility: friendDefaultVisibility,
        },
        ...current.relationships,
      ],
      usageEvents: [
        {
          id: crypto.randomUUID(),
          userId: requesterId,
          feature: "friendRequest",
          createdAt: new Date().toISOString(),
        },
        ...current.usageEvents,
      ],
    };
  });
}

export function acceptFriendRequest(
  currentUserId: string,
  requesterId: string,
  updateState: UpdateState,
) {
  updateState((current) => ({
    ...current,
    relationships: current.relationships.map((relationship) =>
      relationship.requesterId === requesterId &&
      relationship.recipientId === currentUserId &&
      relationship.status === "pending"
        ? {
            ...relationship,
            status: "accepted",
            visibility: friendDefaultVisibility,
          }
        : relationship,
    ),
    usageEvents: [
      {
        id: crypto.randomUUID(),
        userId: currentUserId,
        feature: "friendAccept",
        createdAt: new Date().toISOString(),
      },
      ...current.usageEvents,
    ],
  }));
}

export function sendReaction(
  fromUserId: string,
  toUserId: string,
  updateState: UpdateState,
) {
  const today = todayKey();
  updateState((current) => {
    const hasReaction = current.reactions.some(
      (reaction) =>
        reaction.fromUserId === fromUserId &&
        reaction.toUserId === toUserId &&
        reaction.targetDate === today,
    );
    if (hasReaction) return current;
    return {
      ...current,
      reactions: [
        {
          id: crypto.randomUUID(),
          fromUserId,
          toUserId,
          targetDate: today,
          emoji: "flame",
          createdAt: new Date().toISOString(),
        },
        ...current.reactions,
      ],
      usageEvents: [
        {
          id: crypto.randomUUID(),
          userId: fromUserId,
          feature: "emojiReactions",
          createdAt: new Date().toISOString(),
        },
        ...current.usageEvents,
      ],
    };
  });
}

export function updateUserStatus(
  userId: string,
  status: UserProfile["status"],
  actorId: string,
  updateState: UpdateState,
) {
  updateState((current) => ({
    ...current,
    users: current.users.map((user) =>
      user.id === userId ? { ...user, status } : user,
    ),
    auditEvents: [
      {
        id: crypto.randomUUID(),
        actorId,
        targetUserId: userId,
        action: `set_status_${status}`,
        createdAt: new Date().toISOString(),
      },
      ...current.auditEvents,
    ],
  }));
}

export function updateUserRole(
  userId: string,
  role: UserProfile["role"],
  actorId: string,
  updateState: UpdateState,
) {
  updateState((current) => ({
    ...current,
    users: current.users.map((user) =>
      user.id === userId ? { ...user, role } : user,
    ),
    auditEvents: [
      {
        id: crypto.randomUUID(),
        actorId,
        targetUserId: userId,
        action: `set_role_${role}`,
        createdAt: new Date().toISOString(),
      },
      ...current.auditEvents,
    ],
  }));
}
