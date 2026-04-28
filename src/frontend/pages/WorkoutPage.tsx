import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useApp } from "../app/AppContext";
import { Panel, Switch } from "../components/ui";
import {
  latestSetForExercise,
  saveWorkoutLogForDate,
} from "../state/demoActions";
import { kgToLb, lbToKg, round } from "../../lib/calculations";
import type {
  ActivityLevel,
  ExerciseTemplate,
  WorkoutDay,
  WorkoutLog,
} from "../../types";
import { CollapsiblePlanManager } from "../components/workout/PlanSelector";
import { ExerciseCard, type ExerciseInput } from "../components/workout/ExerciseCard";
import {
  AddExerciseForm,
  type ExerciseTrackingMode,
  type ExerciseSuggestion,
} from "../components/workout/AddExerciseForm";
import { DayTabBar } from "../components/workout/DayTabBar";
import { useBackendActions } from "../backend/BackendActionsContext";

// Monday=0 … Sunday=6
function getDayIndex() {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

function getLogDateForOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function toDisplayWeight(weightKg: number, unit: "metric" | "us") {
  return unit === "us" ? round(kgToLb(weightKg), 1) : round(weightKg, 2);
}

function buildInputs(
  day: WorkoutDay,
  workouts: WorkoutLog[],
  progressionUnit: "metric" | "us",
): Record<string, ExerciseInput> {
  return Object.fromEntries(
    day.exercises.map((ex) => {
      const lastSet = latestSetForExercise(workouts, ex.name);
      const nextWeightKg =
        ex.category === "strength" && lastSet?.weightKg != null
          ? lastSet.weightKg + (ex.incrementKg ?? 0)
          : 20;
      return [
        ex.id,
        {
          sets: ex.sets,
          reps: lastSet?.reps ?? ex.maxReps ?? ex.minReps ?? 8,
          weight: toDisplayWeight(nextWeightKg, progressionUnit),
          durationSeconds: ex.durationSeconds ?? 25,
        },
      ];
    }),
  );
}

function toKg(weight: number, isUs: boolean) {
  return isUs ? lbToKg(weight) : weight;
}

// Rough MET-based calorie estimate for timed exercises
function estimateCaloriesBurned(
  durationSeconds: number,
  category: string,
  weightKg: number,
): number {
  const MET: Record<string, number> = {
    cardio: 5, rest: 3.5, mobility: 2.5, core: 4, bodyweight: 5, strength: 5,
  };
  const met = MET[category] ?? 4;
  return Math.round(met * weightKg * (durationSeconds / 3600));
}

function inferActivityLevelFromPlan(days: WorkoutDay[]): ActivityLevel {
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

export function WorkoutPage() {
  const { currentUser, state, updateState, latestMeasurement } = useApp();
  const backend = useBackendActions();
  const user = currentUser!;
  const workouts = useMemo(
    () => state.workoutLogs.filter((e) => e.userId === user.id),
    [state.workoutLogs, user.id],
  );

  const activeTemplate = state.workoutPlanTemplates?.find(
    (t) => t.id === state.activeWorkoutPlanId,
  );
  const activePlan: WorkoutDay[] = activeTemplate?.days ?? state.workoutPlan;
  const todayIndex = getDayIndex() % Math.max(activePlan.length, 1);

  // ── Single source of truth: dateOffset ─────────────────────────────────
  const [dateOffset, setDateOffset] = useState(0);

  // Derived from dateOffset
  const logDate = useMemo(() => getLogDateForOffset(dateOffset), [dateOffset]);
  const planLen = Math.max(activePlan.length, 1);
  const planIdx = ((todayIndex + dateOffset) % planLen + planLen) % planLen;
  const selectedDay = activePlan[planIdx] ?? activePlan[0];

  // ── Plan management ─────────────────────────────────────────────────────
  const [planName, setPlanName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>();
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseReps, setNewExerciseReps] = useState(8);
  const [newExerciseDurationSeconds, setNewExerciseDurationSeconds] =
    useState(25);
  const [newExerciseMode, setNewExerciseMode] =
    useState<ExerciseTrackingMode>("weighted");
  const [newExerciseCategory, setNewExerciseCategory] =
    useState<ExerciseTemplate["category"]>("strength");
  const [localProgressionUnit, setLocalProgressionUnit] = useState(user.units.weight);
  const progressionUnit = localProgressionUnit;
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const exerciseSuggestions = useMemo<ExerciseSuggestion[]>(() => {
    const seen = new Set<string>();
    return activePlan
      .flatMap((day) =>
        day.exercises.map((exercise) => ({
          exercise,
          sourceLabel: day.dayName,
        })),
      )
      .filter(({ exercise }) => {
        const key = exercise.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [activePlan]);

  // ── Per-day input store (ref so edits survive day switching) ───────────
  const inputsMapRef = useRef<Map<string, Record<string, ExerciseInput>>>(new Map());

  function getInputsForDay(day: WorkoutDay) {
    if (!inputsMapRef.current.has(day.id)) {
      inputsMapRef.current.set(day.id, buildInputs(day, workouts, progressionUnit));
    }
    return inputsMapRef.current.get(day.id)!;
  }

  const [exerciseInputs, setExerciseInputs] = useState<Record<string, ExerciseInput>>(
    () => (selectedDay ? getInputsForDay(selectedDay) : {}),
  );

  const prevDayIdRef = useRef(selectedDay?.id);
  useEffect(() => {
    if (!selectedDay || selectedDay.id === prevDayIdRef.current) return;
    prevDayIdRef.current = selectedDay.id;
    setExerciseInputs({ ...getInputsForDay(selectedDay) });
  }, [selectedDay]);

  useEffect(() => {
    if (!selectedDay) return;
    const existingLog = workouts.find(
      (log) => log.date === logDate,
    );
    if (!existingLog) {
      setCompletedExerciseIds(new Set());
      return;
    }
    if (existingLog.status === "completed") {
      setCompletedExerciseIds(new Set(selectedDay.exercises.map((ex) => ex.id)));
      return;
    }
    const loggedNames = new Set(
      existingLog.sets.map((set) => set.exerciseName.trim().toLowerCase()),
    );
    setCompletedExerciseIds(
      new Set(
        selectedDay.exercises
          .filter((ex) => loggedNames.has(ex.name.trim().toLowerCase()))
          .map((ex) => ex.id),
      ),
    );
  }, [logDate, selectedDay, workouts]);

  // ── Plan mutation helper ────────────────────────────────────────────────
  function updateActivePlanDays(mutator: (days: WorkoutDay[]) => WorkoutDay[]) {
    updateState((current) => {
      const tpl = current.workoutPlanTemplates?.find(
        (t) => t.id === current.activeWorkoutPlanId,
      );
      const base = tpl?.days ?? current.workoutPlan;
      const updated = mutator(base);
      return {
        ...current,
        workoutPlan: updated,
        workoutPlanTemplates: current.workoutPlanTemplates?.map((t) =>
          t.id === current.activeWorkoutPlanId ? { ...t, days: updated } : t,
        ),
      };
    });
  }

  function createCustomPlan(name: string, days: WorkoutDay[]) {
    const trimmed = name.trim();
    if (!trimmed || !days.length) return;
    const inferredActivity = inferActivityLevelFromPlan(days);
    void backend.createWorkoutPlan(name, days).then((planId) => {
      if (planId) {
        void backend.updateProfileSettings({
          activityLevel: inferredActivity,
          activeWorkoutPlanId: planId,
        });
      }
    });
    void backend.updateProfileSettings({ activityLevel: inferredActivity });
    updateState((current) => {
      const plan = {
        id: crypto.randomUUID(),
        name: trimmed,
        days,
        createdAt: new Date().toISOString(),
      };
      return {
        ...current,
        workoutPlanTemplates: [...(current.workoutPlanTemplates ?? []), plan],
        activeWorkoutPlanId: plan.id,
        workoutPlan: plan.days,
        users: current.users.map((candidate) =>
          candidate.id === user.id
            ? { ...candidate, activityLevel: inferredActivity }
            : candidate,
        ),
      };
    });
    setStatusMessage(`Plan "${trimmed}" saved`);
    setPlanName("");
  }

  function handleExerciseInputChange(exId: string, updated: ExerciseInput) {
    setExerciseInputs((cur) => {
      const next = { ...cur, [exId]: updated };
      if (selectedDay) inputsMapRef.current.set(selectedDay.id, next);
      return next;
    });
    setCompletedExerciseIds((current) => {
      if (!current.has(exId)) return current;
      const next = new Set(current);
      next.delete(exId);
      return next;
    });
  }

  function addExerciseToDay() {
    const name = newExerciseName.trim();
    if (!selectedDay || !name) return;
    const category = categoryForMode(newExerciseMode, newExerciseCategory);
    const created: ExerciseTemplate = {
      id: crypto.randomUUID(), name,
      sets: Math.max(1, newExerciseSets),
      minReps:
        newExerciseMode === "timed" ? undefined : Math.max(1, newExerciseReps),
      maxReps:
        newExerciseMode === "timed" ? undefined : Math.max(1, newExerciseReps),
      durationSeconds:
        newExerciseMode === "timed"
          ? Math.max(1, newExerciseDurationSeconds)
          : undefined,
      category,
      incrementKg: newExerciseMode === "weighted" ? 0.5 : undefined,
    };
    const updatedDays = activePlan.map((d) =>
        d.id === selectedDay.id ? { ...d, exercises: [...d.exercises, created] } : d,
    );
    updateActivePlanDays(() => updatedDays);
    if (activeTemplate) {
      void backend.updateWorkoutPlan(
        activeTemplate.id,
        activeTemplate.name,
        updatedDays,
      );
    }
    setExerciseInputs((cur) => {
      const next = {
        ...cur,
        [created.id]: {
          sets: created.sets,
          reps: created.maxReps ?? 8,
          weight: progressionUnit === "us" ? 44 : 20,
          durationSeconds: created.durationSeconds ?? 25,
        },
      };
      if (selectedDay) inputsMapRef.current.set(selectedDay.id, next);
      return next;
    });
    setNewExerciseName("");
    setStatusMessage(`Added ${name}`);
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

  function saveWorkoutLog(idsToSave = completedExerciseIds, forceAll = false) {
    if (!selectedDay) return;
    const exerciseIdsToSave = forceAll
      ? new Set(selectedDay.exercises.map((ex) => ex.id))
      : idsToSave;
    const status = selectedDay.isRestDay
      ? "rest"
      : exerciseIdsToSave.size >= selectedDay.exercises.length
        ? "completed"
        : "partial";
    const sets = selectedDay.isRestDay
      ? []
      : selectedDay.exercises.filter((ex) => exerciseIdsToSave.has(ex.id)).flatMap((ex) => {
          const inp = exerciseInputs[ex.id] ?? {
            sets: ex.sets,
            reps: ex.maxReps ?? 8,
            weight: 20,
            durationSeconds: ex.durationSeconds ?? 25,
          };
          return Array.from({ length: Math.max(1, inp.sets) }, (_, i) => ({
            id: crypto.randomUUID(), exerciseName: ex.name, setNumber: i + 1,
            reps: ex.durationSeconds ? undefined : inp.reps,
            durationSeconds: ex.durationSeconds ? inp.durationSeconds : undefined,
            weightKg: ex.category === "strength" ? toKg(inp.weight, progressionUnit === "us") : undefined,
            completed: true,
          }));
        });

    saveWorkoutLogForDate(user, state, updateState, {
      date: logDate, dayId: selectedDay.id, status, sets,
    });
    void backend.saveWorkoutLog({
      date: logDate,
      planDayId: selectedDay.id,
      status,
      sets: sets.map(({ id: _id, ...set }) => set),
    });
    setStatusMessage(`✓ Saved for ${logDate}`);
  }

  function completeExercise(exercise: ExerciseTemplate) {
    if (!selectedDay || selectedDay.isRestDay) return;
    if (completedExerciseIds.has(exercise.id)) return;
    const next = new Set(completedExerciseIds);
    next.add(exercise.id);
    setCompletedExerciseIds(next);
    saveWorkoutLog(next);
    toast.success(`${next.size}/${selectedDay.exercises.length} done: ${exercise.name}`);
  }

  function completeWorkout() {
    if (!selectedDay) return;
    if (
      !selectedDay.isRestDay &&
      selectedDay.exercises.length > 0 &&
      completedExerciseIds.size >= selectedDay.exercises.length
    ) {
      return;
    }
    const allIds = new Set(selectedDay.exercises.map((ex) => ex.id));
    setCompletedExerciseIds(allIds);
    saveWorkoutLog(allIds, true);
    toast.success(
      selectedDay.isRestDay
        ? "Rest day logged"
        : `${selectedDay.exercises.length}/${selectedDay.exercises.length} workout complete`,
    );
  }

  function resetDayProgress() {
    if (!selectedDay || selectedDay.isRestDay) return;
    const emptyProgress = new Set<string>();
    setCompletedExerciseIds(emptyProgress);
    saveWorkoutLog(emptyProgress);
    toast("Day progress reset", {
      icon: "↺",
    });
  }

  // Calorie estimate for rest days with timed exercises
  const totalEstimatedCal = selectedDay
    ? selectedDay.exercises
        .filter((ex) => !!ex.durationSeconds)
        .reduce(
          (sum, ex) =>
            sum + estimateCaloriesBurned(ex.durationSeconds!, ex.category, latestMeasurement?.weightKg ?? 70),
          0,
        )
    : 0;

  const planSelectorProps = {
    state,
    planName,
    onPlanNameChange: setPlanName,
    onCreatePlan: createCustomPlan,
    updateState,
  };
  const allExercisesCompleted = Boolean(
    selectedDay &&
      !selectedDay.isRestDay &&
      selectedDay.exercises.length > 0 &&
      completedExerciseIds.size >= selectedDay.exercises.length,
  );

  return (
    <div className="space-y-4">
      <CollapsiblePlanManager
        activePlanName={activeTemplate?.name}
        {...planSelectorProps}
      />

      <DayTabBar
        activePlan={activePlan}
        todayIndex={todayIndex}
        dateOffset={dateOffset}
        workoutLogs={workouts}
        onDateOffsetChange={setDateOffset}
      />

      {/* ── Day exercises ─────────────────────────────────────────────── */}
      {selectedDay?.isRestDay ? (
        <Panel
          title={selectedDay.focus}
          headerRight={
            <TrainingUnitHeaderSwitch
              progressionUnit={progressionUnit}
              onToggle={() =>
                setLocalProgressionUnit((unit) =>
                  unit === "metric" ? "us" : "metric",
                )
              }
            />
          }
        >
          <div className="space-y-4">
              {/* Rest day header */}
              <div className="rounded-3xl bg-cream p-5 text-center dark:bg-white/5">
                <p className="text-3xl">😴</p>
                <p className="mt-2 font-black text-plum dark:text-cream">
                  Rest day · {dateOffset === 0 ? "Today" : dateOffset < 0 ? `${Math.abs(dateOffset)} days ago` : `In ${dateOffset} days`}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink/55 dark:text-cream/55">
                  Recovery is training. Log it to keep your streak.
                </p>
              </div>

              {/* Timed exercises (e.g. walking) with calorie estimate */}
              {selectedDay.exercises.length > 0 && (
                <div className="space-y-2">
                  {selectedDay.exercises.map((ex) => {
                    const cal = ex.durationSeconds
                      ? estimateCaloriesBurned(ex.durationSeconds, ex.category, latestMeasurement?.weightKg ?? 70)
                      : null;
                    return (
                      <div key={ex.id} className="flex items-center gap-3 rounded-2xl border border-plum/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/10">
                        <div className="flex-1">
                          <p className="font-black text-plum dark:text-cream">{ex.name}</p>
                          {ex.durationSeconds && (
                            <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                              {ex.sets} × {Math.round(ex.durationSeconds / 60)} min
                            </p>
                          )}
                        </div>
                        {cal !== null && (
                          <span className="rounded-full bg-honey/20 px-2.5 py-1 text-xs font-black text-plum dark:text-cream">
                            ~{cal} cal
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {totalEstimatedCal > 0 && (
                    <p className="text-right text-xs font-black text-plum/60 dark:text-cream/60">
                      Estimated burn: ~{totalEstimatedCal} cal
                    </p>
                  )}
                </div>
              )}

              {/* Add exercise to rest day */}
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
                suggestions={exerciseSuggestions}
                onPickSuggestion={pickExerciseSuggestion}
                onAdd={addExerciseToDay}
              />

              <div className="flex items-center gap-3">
                <button className="focus-ring rounded-2xl bg-plum px-5 py-3 font-black text-white" onClick={completeWorkout}>
                  Log rest day ✓
                </button>
                {statusMessage && (
                  <p className="text-sm font-bold text-plum dark:text-honey">{statusMessage}</p>
                )}
              </div>
          </div>
        </Panel>
      ) : (
        <Panel
          title={selectedDay?.focus ?? "Workout"}
          headerRight={
            <TrainingUnitHeaderSwitch
              progressionUnit={progressionUnit}
              onToggle={() =>
                setLocalProgressionUnit((unit) =>
                  unit === "metric" ? "us" : "metric",
                )
              }
            />
          }
        >
          <div className="space-y-4">
              <div className="rounded-3xl bg-cream p-3 dark:bg-white/10">
                <div className="flex items-center justify-between text-xs font-black uppercase text-ink/50 dark:text-cream/55">
                  <span>Today&apos;s progress</span>
                  <span>
                    {completedExerciseIds.size}/{selectedDay?.exercises.length ?? 0}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-white/20">
                  <div
                    className="h-full rounded-full bg-honey transition-all"
                    style={{
                      width: `${
                        selectedDay?.exercises.length
                          ? (completedExerciseIds.size / selectedDay.exercises.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              {/* Exercise list */}
              {!selectedDay?.exercises.length ? (
                <div className="rounded-3xl border border-dashed border-plum/20 p-5 text-center">
                  <p className="text-sm font-semibold text-ink/50 dark:text-cream/50">
                    No exercises yet — add one below ↓
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.exercises.map((ex) => {
                    const inp = exerciseInputs[ex.id] ?? {
                      sets: ex.sets,
                      reps: ex.maxReps ?? ex.minReps ?? 8,
                      weight: 20,
                      durationSeconds: ex.durationSeconds ?? 25,
                    };
                    const completionIndex = selectedDay.exercises
                      .filter((candidate) => completedExerciseIds.has(candidate.id))
                      .findIndex((candidate) => candidate.id === ex.id) + 1;
                    return (
                      <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        input={inp}
                        workouts={workouts}
                        progressiveMode={false}
                        progressionUnit={progressionUnit}
                        completed={completedExerciseIds.has(ex.id)}
                        completionIndex={
                          completedExerciseIds.has(ex.id)
                            ? completionIndex
                            : undefined
                        }
                        totalExercises={selectedDay.exercises.length}
                        onChange={(updated) => handleExerciseInputChange(ex.id, updated)}
                        onComplete={() => completeExercise(ex)}
                      />
                    );
                  })}
                </div>
              )}

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
                suggestions={exerciseSuggestions}
                onPickSuggestion={pickExerciseSuggestion}
                onAdd={addExerciseToDay}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className={`focus-ring rounded-2xl px-5 py-3 font-black ${
                    allExercisesCompleted
                      ? "cursor-not-allowed bg-plum/30 text-white/70"
                      : "bg-plum text-white"
                  }`}
                  disabled={allExercisesCompleted}
                  onClick={completeWorkout}
                >
                  Complete workout ✓
                </button>
                <button
                  className="focus-ring rounded-2xl border border-plum/15 px-4 py-3 text-sm font-black text-plum disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/15 dark:text-cream"
                  disabled={completedExerciseIds.size === 0}
                  onClick={resetDayProgress}
                >
                  Reset day
                </button>
                {statusMessage && (
                  <p className="text-sm font-bold text-plum dark:text-honey">{statusMessage}</p>
                )}
              </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function TrainingUnitHeaderSwitch({
  progressionUnit,
  onToggle,
}: {
  progressionUnit: "metric" | "us";
  onToggle: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-xs font-black uppercase text-plum dark:text-cream">
      <span>kg</span>
      <Switch enabled={progressionUnit === "us"} onChange={onToggle} />
      <span>lb</span>
    </div>
  );
}
