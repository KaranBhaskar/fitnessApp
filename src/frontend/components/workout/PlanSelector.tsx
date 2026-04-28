import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type {
  ActivityLevel,
  AppState,
  ExerciseTemplate,
  WorkoutDay,
  WorkoutTag,
} from "../../../types";
import { classNames } from "../../../lib/format";
import { useBackendActions } from "../../backend/BackendActionsContext";
import {
  AddExerciseForm,
  type ExerciseTrackingMode,
  type ExerciseSuggestion,
} from "./AddExerciseForm";

type UpdateState = (updater: (current: AppState) => AppState) => void;

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type DayKind = "upper_body" | "lower_body" | "full_body" | "cardio" | "rest";

const DAY_KIND_OPTIONS: Array<{
  kind: DayKind;
  label: string;
  emoji: string;
  focus: string;
  tags: WorkoutTag[];
  isRestDay?: boolean;
}> = [
  { kind: "upper_body", label: "Upper", emoji: "💪", focus: "Upper body", tags: ["upper_body"] },
  { kind: "lower_body", label: "Lower", emoji: "🦵", focus: "Lower body", tags: ["lower_body"] },
  { kind: "full_body", label: "Full", emoji: "🏋️", focus: "Full body", tags: ["full_body"] },
  { kind: "cardio", label: "Cardio", emoji: "🏃", focus: "Cardio", tags: ["cardio"] },
  { kind: "rest", label: "Rest", emoji: "😴", focus: "Rest / walking", tags: ["cardio"], isRestDay: true },
];

const TEMPLATE_OPTIONS: Array<{ label: string; note: string; pattern: DayKind[] }> = [
  {
    label: "3 days",
    note: "Full body with recovery between sessions",
    pattern: ["full_body", "rest", "full_body", "rest", "full_body", "cardio", "rest"],
  },
  {
    label: "4 days",
    note: "Upper/lower, two on, one break, two on",
    pattern: ["upper_body", "lower_body", "rest", "upper_body", "lower_body", "cardio", "rest"],
  },
  {
    label: "5 days",
    note: "Balanced strength plus cardio",
    pattern: ["upper_body", "lower_body", "cardio", "upper_body", "lower_body", "full_body", "rest"],
  },
  {
    label: "6 days",
    note: "Higher frequency with one full rest day",
    pattern: ["upper_body", "lower_body", "cardio", "upper_body", "lower_body", "full_body", "rest"],
  },
];

interface PlanSelectorProps {
  state: AppState;
  planName: string;
  onPlanNameChange: (name: string) => void;
  onCreatePlan: (name: string, days: WorkoutDay[]) => void;
  updateState: UpdateState;
  showBuilder?: boolean;
}

export function PlanSelector({
  state,
  planName,
  onPlanNameChange,
  onCreatePlan,
  updateState,
  showBuilder = false,
}: PlanSelectorProps) {
  const backend = useBackendActions();
  const [dayKinds, setDayKinds] = useState<DayKind[]>([
    "upper_body",
    "lower_body",
    "cardio",
    "upper_body",
    "lower_body",
    "cardio",
    "rest",
  ]);
  const [builderDayIndex, setBuilderDayIndex] = useState(0);
  const [draftExercises, setDraftExercises] = useState<Record<number, ExerciseTemplate[]>>({});
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState(8);
  const [newExerciseDurationSeconds, setNewExerciseDurationSeconds] =
    useState(25);
  const [newExerciseMode, setNewExerciseMode] =
    useState<ExerciseTrackingMode>("weighted");
  const [newExerciseCategory, setNewExerciseCategory] =
    useState<ExerciseTemplate["category"]>("strength");

  function createPlan() {
    const trimmed = planName.trim();
    if (!trimmed) return;
    const days = dayKinds.map((kind, index) => {
      const option = DAY_KIND_OPTIONS.find((item) => item.kind === kind)!;
      return {
        id: crypto.randomUUID(),
        dayName: WEEK_DAYS[index],
        focus: option.focus,
        tags: option.tags,
        isRestDay: option.isRestDay,
        exercises: option.isRestDay
          ? [
              {
                id: crypto.randomUUID(),
                name: "Rest day or easy walk",
                sets: 1,
                durationSeconds: 1800,
                category: "rest" as const,
              },
            ]
          : draftExercises[index] ?? [],
      };
    });
    onCreatePlan(trimmed, days);
  }

  function addExerciseToBuilderDay() {
    const name = newExerciseName.trim();
    if (!name) return;
    const category = categoryForMode(newExerciseMode, newExerciseCategory);
    const created: ExerciseTemplate = {
      id: crypto.randomUUID(),
      name,
      sets: Math.max(1, newExerciseSets),
      minReps:
        newExerciseMode === "timed" ? undefined : Math.max(1, newExerciseReps),
      maxReps:
        newExerciseMode === "timed" ? undefined : Math.max(1, newExerciseReps),
      durationSeconds:
        newExerciseMode === "timed"
          ? Math.max(1, newExerciseDurationSeconds)
          : undefined,
      incrementKg: newExerciseMode === "weighted" ? 0.5 : undefined,
      category,
    };
    setDraftExercises((current) => ({
      ...current,
      [builderDayIndex]: [...(current[builderDayIndex] ?? []), created],
    }));
    setNewExerciseName("");
  }

  function pickExerciseSuggestion(exercise: ExerciseTemplate) {
    setNewExerciseName(exercise.name);
    setNewExerciseSets(exercise.sets);
    setNewExerciseReps(exercise.maxReps ?? exercise.minReps ?? 8);
    setNewExerciseDurationSeconds(exercise.durationSeconds ?? 25);
    setNewExerciseMode(modeForExercise(exercise));
    setNewExerciseCategory(exercise.category);
  }

  function handleNewExerciseModeChange(mode: ExerciseTrackingMode) {
    setNewExerciseMode(mode);
    setNewExerciseCategory((category) => categoryForMode(mode, category));
  }

  const builderSuggestions = buildExerciseSuggestions(
    state.workoutPlanTemplates ?? [],
    draftExercises,
  );

  return (
    <div className="space-y-4">
      {!showBuilder && (
        <label className="block text-xs font-black uppercase text-ink/55 dark:text-cream/70">
          Active plan
          <select
            className="focus-ring mt-1 w-full rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
            value={state.activeWorkoutPlanId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value;
              const nextTemplate = state.workoutPlanTemplates?.find(
                (template) => template.id === nextId,
              );
              const activityLevel = inferActivityLevel(nextTemplate?.days ?? []);
              void backend.updateProfileSettings({
                activityLevel,
                activeWorkoutPlanId: nextId,
              });
              updateState((current) => {
                return {
                  ...current,
                  activeWorkoutPlanId: nextId,
                  workoutPlan: nextTemplate?.days ?? current.workoutPlan,
                  users: current.users.map((user) =>
                    user.id === current.currentUserId
                      ? { ...user, activityLevel }
                      : user,
                  ),
                };
              });
            }}
          >
            {(state.workoutPlanTemplates ?? []).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!showBuilder ? (
        <Link
          to="/workouts/plans/new"
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-plum/15 bg-white px-4 py-3 text-sm font-black text-plum dark:border-white/15 dark:bg-white dark:text-plum"
        >
          <Plus size={16} /> Create your own plan
        </Link>
      ) : (
        <div className="rounded-3xl border border-plum/10 bg-white p-3 dark:border-white/10 dark:bg-white/10">
          <div className="mb-3">
            <p className="text-xs font-black uppercase text-ink/55 dark:text-cream/70">
              Create your own weekly plan
            </p>
            <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-cream/55">
              Start with a weekly template, then choose one day at a time.
            </p>
          </div>

          <input
            className="focus-ring w-full rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink placeholder:text-ink/40 dark:border-white/15 dark:bg-white dark:text-plum"
            placeholder="Plan name"
            value={planName}
            onChange={(event) => onPlanNameChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createPlan()}
          />

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {TEMPLATE_OPTIONS.map((template) => (
              <button
                key={template.label}
                className="focus-ring rounded-2xl border border-plum/10 bg-cream p-3 text-left text-plum hover:bg-white dark:border-white/10 dark:bg-white dark:text-plum"
                onClick={() => {
                  setDayKinds(template.pattern);
                  setBuilderDayIndex(0);
                }}
              >
                <p className="font-black">{template.label}</p>
                <p className="mt-1 text-xs font-semibold opacity-60">{template.note}</p>
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl bg-cream p-3 dark:bg-white/10">
            <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/55">
              Day {builderDayIndex + 1} of 7
            </p>
            <h3 className="mt-1 text-xl font-black text-plum dark:text-cream">
              {WEEK_DAYS[builderDayIndex]}
            </h3>
            <p className="mt-1 text-sm font-semibold text-ink/55 dark:text-cream/55">
              What do you want this day to be?
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {DAY_KIND_OPTIONS.map((option) => {
                const active = dayKinds[builderDayIndex] === option.kind;
                return (
                  <button
                    key={option.kind}
                    className={classNames(
                      "focus-ring rounded-xl px-1.5 py-2 text-center text-[0.68rem] font-black transition-colors",
                      active
                        ? "bg-plum text-white"
                        : "bg-white text-plum hover:bg-plum/5 dark:bg-white dark:text-plum",
                    )}
                    onClick={() =>
                      setDayKinds((current) =>
                        current.map((kind, dayIndex) =>
                          dayIndex === builderDayIndex ? option.kind : kind,
                        ),
                      )
                    }
                  >
                    <span className="block text-base">{option.emoji}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className="focus-ring flex-1 rounded-2xl border border-plum/15 bg-white px-4 py-2 text-sm font-black text-plum disabled:opacity-40 dark:bg-white dark:text-plum"
                disabled={builderDayIndex === 0}
                onClick={() => setBuilderDayIndex((index) => Math.max(0, index - 1))}
              >
                Back
              </button>
              <button
                className="focus-ring flex-1 rounded-2xl bg-plum px-4 py-2 text-sm font-black text-white"
                onClick={() =>
                  setBuilderDayIndex((index) =>
                    index === WEEK_DAYS.length - 1 ? index : index + 1,
                  )
                }
              >
                {builderDayIndex === WEEK_DAYS.length - 1 ? "Review" : "Next day"}
              </button>
            </div>
            {dayKinds[builderDayIndex] === "rest" ? (
              <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-plum dark:bg-white dark:text-plum">
                Rest day selected. Nothing else needed here.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {(draftExercises[builderDayIndex] ?? []).map((exercise) => (
                  <div
                    key={exercise.id}
                    className="rounded-2xl bg-white px-3 py-2 text-sm font-bold text-plum dark:bg-white dark:text-plum"
                  >
                    {exercise.name} · {exercise.sets}×
                    {exercise.durationSeconds
                      ? `${exercise.durationSeconds}s`
                      : exercise.maxReps ?? exercise.minReps}
                  </div>
                ))}
                <AddExerciseForm
                  newExerciseName={newExerciseName}
                  newExerciseSets={newExerciseSets}
                  newExerciseReps={newExerciseReps}
                  newExerciseDurationSeconds={newExerciseDurationSeconds}
                  newExerciseMode={newExerciseMode}
                  newExerciseCategory={newExerciseCategory}
                  onNameChange={setNewExerciseName}
                  onSetsChange={setNewExerciseSets}
                  onRepsChange={setNewExerciseReps}
                  onDurationSecondsChange={setNewExerciseDurationSeconds}
                  onModeChange={handleNewExerciseModeChange}
                  onCategoryChange={setNewExerciseCategory}
                  suggestions={builderSuggestions}
                  onPickSuggestion={pickExerciseSuggestion}
                  onAdd={addExerciseToBuilderDay}
                />
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEK_DAYS.map((day, index) => {
              const option = DAY_KIND_OPTIONS.find((item) => item.kind === dayKinds[index])!;
              return (
                <button
                  key={day}
                  className={classNames(
                    "focus-ring rounded-xl px-1 py-2 text-center text-[0.65rem] font-black",
                    index === builderDayIndex
                      ? "bg-honey text-plum"
                      : "bg-cream text-plum dark:bg-white dark:text-plum",
                  )}
                  onClick={() => setBuilderDayIndex(index)}
                >
                  <span className="block text-base">{option.emoji}</span>
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <button
            className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-plum px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            onClick={createPlan}
            disabled={!planName.trim()}
          >
            <Plus size={16} /> Create plan
          </button>
        </div>
      )}
    </div>
  );
}

function inferActivityLevel(days: WorkoutDay[]): ActivityLevel {
  const trainingDays = days.filter((day) => !day.isRestDay).length;
  if (trainingDays <= 2) return "light";
  if (trainingDays <= 5) return "moderate";
  if (trainingDays === 6) return "active";
  return "athlete";
}

function modeForExercise(exercise: ExerciseTemplate): ExerciseTrackingMode {
  if (exercise.durationSeconds) return "timed";
  if (exercise.category === "strength" || exercise.incrementKg) return "weighted";
  return "reps";
}

function categoryForMode(
  mode: ExerciseTrackingMode,
  category: ExerciseTemplate["category"],
): ExerciseTemplate["category"] {
  if (mode === "weighted") return "strength";
  if (mode === "reps" && category === "strength") return "bodyweight";
  if (mode === "timed" && category === "strength") return "core";
  return category;
}

function buildExerciseSuggestions(
  templates: NonNullable<AppState["workoutPlanTemplates"]>,
  draftExercises: Record<number, ExerciseTemplate[]>,
): ExerciseSuggestion[] {
  const seen = new Set<string>();
  const suggestions: ExerciseSuggestion[] = [];
  const push = (exercise: ExerciseTemplate, sourceLabel?: string) => {
    const key = exercise.name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    suggestions.push({ exercise, sourceLabel });
  };

  Object.values(draftExercises)
    .flat()
    .forEach((exercise) => push(exercise, "this draft"));

  templates.forEach((template) =>
    template.days.forEach((day) =>
      day.exercises.forEach((exercise) =>
        push(exercise, `${template.name} · ${day.dayName}`),
      ),
    ),
  );

  return suggestions.slice(0, 12);
}

interface CollapsiblePlanManagerProps extends PlanSelectorProps {
  activePlanName: string | undefined;
}

export function CollapsiblePlanManager({
  activePlanName,
  ...rest
}: CollapsiblePlanManagerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[1.75rem] border border-plum/10 bg-white dark:border-white/10 dark:bg-white/10">
      <button
        className="focus-ring flex w-full items-center justify-between rounded-[1.75rem] px-5 py-4 text-left sm:px-6"
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/55">
            Active plan
          </p>
          <p className="mt-1 text-xl font-black text-plum dark:text-cream">
            {activePlanName ?? "Default weekly plan"}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={classNames(
            "text-plum/50 transition-transform dark:text-cream/50",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-plum/10 px-4 pb-4 pt-3 dark:border-white/10">
          <PlanSelector {...rest} />
        </div>
      )}
    </div>
  );
}
