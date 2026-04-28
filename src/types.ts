export type UnitSystem = "metric" | "us";
export type SexForEstimate = "male" | "female";
export type AppMode = "beta" | "open";
export type UserRole = "super_admin" | "admin" | "user";
export type UserStatus = "pending" | "approved" | "suspended";
export type GoalType = "fat_loss_strength" | "strength" | "wellness";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";

export interface UnitPreferences {
  weight: UnitSystem;
  height: UnitSystem;
  neck: UnitSystem;
  waist: UnitSystem;
  hip: UnitSystem;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  onboardingComplete: boolean;
  units: UnitPreferences;
  age: number;
  sexForEstimate: SexForEstimate;
  activityLevel: ActivityLevel;
  goal: GoalType;
  createdAt: string;
  leaderboardVisible?: boolean;
  activeWorkoutPlanId?: string;
}

export interface MeasurementEntry {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number;
}

export interface NutritionLog {
  id: string;
  userId: string;
  date: string;
  calories: number;
  proteinGrams: number;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  sets: number;
  minReps?: number;
  maxReps?: number;
  durationSeconds?: number;
  incrementKg?: number;
  category: "strength" | "bodyweight" | "cardio" | "mobility" | "core" | "rest";
}

export interface WorkoutDay {
  id: string;
  dayName: string;
  focus: string;
  tags?: WorkoutTag[];
  isRestDay?: boolean;
  exercises: ExerciseTemplate[];
}

export type WorkoutTag = "upper_body" | "lower_body" | "full_body" | "cardio";

export interface WorkoutPlanTemplate {
  id: string;
  name: string;
  days: WorkoutDay[];
  createdAt: string;
}

export interface SetLog {
  id: string;
  exerciseName: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  completed: boolean;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  date: string;
  workoutDayId: string;
  status: "completed" | "rest" | "partial";
  sets: SetLog[];
  notes?: string;
}

export interface FeatureFlags {
  workouts: boolean;
  nutrition: boolean;
  measurements: boolean;
  projections: boolean;
  friends: boolean;
  emojiReactions: boolean;
  calorieStreaks: boolean;
  proteinStreaks: boolean;
  onboardingRequired: boolean;
}

export interface SharingVisibility {
  streakStatus: boolean;
  streakLength: boolean;
  workoutSummary: boolean;
  caloriesGoalStatus: boolean;
  proteinGoalStatus: boolean;
  currentWeight: boolean;
  weightTrendline: boolean;
  projections: boolean;
  bodyMeasurements: boolean;
}

export type RelationshipTier = "friend";
export type RelationshipStatus = "pending" | "accepted" | "blocked";

export interface Relationship {
  id: string;
  requesterId: string;
  recipientId: string;
  tier: RelationshipTier;
  status: RelationshipStatus;
  visibility: SharingVisibility;
}

export interface EmojiReaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  targetDate: string;
  emoji: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  targetUserId?: string;
  action: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface UsageEvent {
  id: string;
  userId: string;
  feature: string;
  createdAt: string;
}

export interface AppSettings {
  mode: AppMode;
}

export interface AppState {
  appSettings: AppSettings;
  featureFlags: FeatureFlags;
  users: UserProfile[];
  currentUserId?: string;
  measurements: MeasurementEntry[];
  nutritionLogs: NutritionLog[];
  workoutPlan: WorkoutDay[];
  workoutPlanTemplates?: WorkoutPlanTemplate[];
  activeWorkoutPlanId?: string;
  workoutLogs: WorkoutLog[];
  relationships: Relationship[];
  reactions: EmojiReaction[];
  auditEvents: AuditEvent[];
  usageEvents: UsageEvent[];
}

export interface CalorieTarget {
  maintenanceCalories: number;
  minGoalCalories: number;
  maxGoalCalories: number;
}

export interface BodyComposition {
  bmi: number;
  bodyFatPercentage: number;
  leanMassKg: number;
  fatMassKg: number;
}

export interface WeightProjection {
  label: string;
  daysAhead: number;
  projectedWeightKg: number;
}

export interface ProjectionSummary {
  latestWeightKg?: number;
  dailyChangeKg?: number;
  trend: "decreasing" | "flat" | "increasing" | "insufficient";
  projections: WeightProjection[];
}

export interface StreakSummary {
  workoutStreak: number;
  calorieStreak: number;
  proteinStreak: number;
  overallStreak: number;
  activeToday: boolean;
}
