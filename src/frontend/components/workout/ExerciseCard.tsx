import { useRef } from "react";
import type { ExerciseTemplate, UnitSystem, WorkoutLog } from "../../../types";
import { latestSetForExercise } from "../../state/demoActions";
import { kgToLb, lbToKg, round } from "../../../lib/calculations";

export type ExerciseInput = {
  sets: number;
  reps: number;
  weight: number; // always in the user's progressionUnit
  durationSeconds: number;
};

function toDisplay(weightKg: number, unit: UnitSystem): number {
  return unit === "us" ? round(kgToLb(weightKg), 1) : round(weightKg, 2);
}

function toKg(weight: number, unit: UnitSystem): number {
  return unit === "us" ? lbToKg(weight) : weight;
}

function unitLabel(unit: UnitSystem) {
  return unit === "us" ? "lb" : "kg";
}

function formatDuration(seconds: number) {
  return seconds < 60 ? `${seconds} sec` : `${Math.round(seconds / 60)} min`;
}

interface ExerciseCardProps {
  exercise: ExerciseTemplate;
  input: ExerciseInput;
  workouts: WorkoutLog[];
  progressiveMode: boolean;
  progressionUnit: UnitSystem;
  completed?: boolean;
  completionIndex?: number;
  totalExercises?: number;
  onChange: (updated: ExerciseInput) => void;
  onComplete?: () => void;
}

export function ExerciseCard({
  exercise,
  input,
  workouts,
  progressiveMode,
  progressionUnit,
  completed = false,
  completionIndex,
  totalExercises,
  onChange,
  onComplete,
}: ExerciseCardProps) {
  const weightRef = useRef<HTMLInputElement>(null);

  const lastSet = latestSetForExercise(workouts, exercise.name);
  const lastWeightKg = lastSet?.weightKg ?? null;
  const lastReps = lastSet?.reps ?? null;

  // Per-exercise increment for progressive overload.
  const incrementKg = (exercise.incrementKg ?? 0) * (progressiveMode ? 2 : 1);
  const incrementDisplay = round(
    progressionUnit === "us" ? kgToLb(incrementKg) : incrementKg,
    2,
  );
  const hasIncrement = incrementKg > 0;
  const hasLastSession = lastWeightKg != null && lastReps != null;
  const currentWeightKg = toKg(input.weight, progressionUnit);

  function applySame() {
    if (lastWeightKg == null) return;
    onChange({
      ...input,
      weight: toDisplay(lastWeightKg, progressionUnit),
      reps: lastReps ?? input.reps,
    });
  }

  function applyIncrement(multiplier: number) {
    if (!hasIncrement) return;
    const nextKg = Math.max(0, currentWeightKg + incrementKg * multiplier);
    onChange({
      ...input,
      weight: toDisplay(nextKg, progressionUnit),
      reps: lastReps ?? input.reps,
    });
    // Focus weight so user can confirm / tweak
    setTimeout(() => weightRef.current?.select(), 50);
  }

  const isTimed = !!exercise.durationSeconds;
  const setRepsLabel = isTimed
    ? `${exercise.sets} sets × ${formatDuration(exercise.durationSeconds!)}`
    : `${exercise.sets} × ${exercise.minReps ?? "?"}${
        exercise.maxReps && exercise.maxReps !== exercise.minReps
          ? `–${exercise.maxReps}`
          : ""
      }`;

  // Category chip colour
  const chipColour =
    exercise.category === "strength"
      ? "bg-plum/10 text-plum dark:bg-white dark:text-plum"
      : exercise.category === "cardio"
        ? "bg-honey/20 text-plum dark:bg-honey dark:text-plum"
        : "bg-cream text-ink/60 dark:bg-white dark:text-plum/70";

  return (
    <div
      className={`rounded-3xl border p-4 ${
        completed
          ? "border-honey bg-honey/10 dark:border-honey dark:bg-honey/15"
          : "border-plum/10 bg-white dark:border-white/10 dark:bg-white/10"
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-plum dark:text-cream">
            {exercise.name}
          </h3>
          <p className="mt-0.5 text-xs font-bold text-ink/50 dark:text-cream/50">
            {setRepsLabel}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase ${chipColour}`}
        >
          {completed ? `Done ${completionIndex}/${totalExercises}` : exercise.category}
        </span>
      </div>

      <>
        {!isTimed && (
          <>
          {/* ── Last session row + preset buttons ── */}
          {(hasLastSession || hasIncrement) && (
            <div className="mt-3 rounded-2xl bg-cream px-3 py-2 dark:bg-white dark:text-plum">
              {hasLastSession && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.6rem] font-black uppercase text-ink/40 dark:text-plum/45">
                      Last session
                    </p>
                    <p className="text-sm font-black text-ink dark:text-plum">
                      {toDisplay(lastWeightKg!, progressionUnit)}{" "}
                      {unitLabel(progressionUnit)} × {lastReps} reps
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 gap-1.5">
                    <button
                      className="focus-ring rounded-xl border border-plum/20 bg-white px-2.5 py-1.5 text-xs font-black text-plum transition-colors hover:bg-plum/5 dark:border-plum/20 dark:bg-cream dark:text-plum dark:hover:bg-white"
                      onClick={applySame}
                      title="Use the exact same weight and reps as last time"
                      type="button"
                    >
                      = Same
                    </button>
                  </div>
                </div>
              )}
              {hasIncrement && (
                <div className={hasLastSession ? "mt-3" : ""}>
                  <div className="mb-1 flex items-center justify-between text-[0.6rem] font-black uppercase text-ink/40 dark:text-plum/45">
                    <span>Progression</span>
                    <span>{incrementDisplay} {unitLabel(progressionUnit)} step</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <button
                      className="focus-ring rounded-xl border border-plum/20 bg-white px-2.5 py-1.5 text-xs font-black text-plum transition-colors hover:bg-plum/5 dark:bg-cream"
                      onClick={() => applyIncrement(-1)}
                      type="button"
                      title={`Decrease current weight by ${incrementDisplay} ${unitLabel(progressionUnit)}`}
                    >
                      -{incrementDisplay}
                    </button>
                    <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-cream">
                      <div className="h-full w-1/2 rounded-full bg-honey" />
                    </div>
                    <button
                      className="focus-ring rounded-xl bg-plum px-2.5 py-1.5 text-xs font-black text-white transition-opacity hover:opacity-90"
                      onClick={() => applyIncrement(1)}
                      type="button"
                      title={`Increase current weight by ${incrementDisplay} ${unitLabel(progressionUnit)}`}
                    >
                      +{incrementDisplay}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </>
        )}

        {/* ── Inputs row (always editable) ── */}
        <div className={`mt-3 grid gap-2 ${isTimed ? "grid-cols-2" : "grid-cols-3"}`}>
            <div>
              <label className="mb-1 block text-[0.6rem] font-black uppercase text-ink/40 dark:text-cream/40">
                Sets
              </label>
              <input
                type="number"
                min={1}
                className="focus-ring w-full rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
                value={input.sets}
                onChange={(e) =>
                  onChange({ ...input, sets: Number(e.target.value) || 1 })
                }
              />
            </div>

            {isTimed ? (
              <div>
                <label className="mb-1 block text-[0.6rem] font-black uppercase text-ink/40 dark:text-cream/40">
                  Seconds
                </label>
                <input
                  type="number"
                  min={1}
                  className="focus-ring w-full rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
                  value={input.durationSeconds}
                  onChange={(e) =>
                    onChange({
                      ...input,
                      durationSeconds: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-[0.6rem] font-black uppercase text-ink/40 dark:text-cream/40">
                  Reps
                </label>
                <input
                  type="number"
                  min={1}
                  className="focus-ring w-full rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
                  value={input.reps}
                  onChange={(e) =>
                    onChange({ ...input, reps: Number(e.target.value) || 1 })
                  }
                />
              </div>
            )}

            {!isTimed && (
              <div>
              <label className="mb-1 block text-[0.6rem] font-black uppercase text-ink/40 dark:text-cream/40">
                {exercise.category === "strength"
                  ? unitLabel(progressionUnit)
                  : "—"}
              </label>
              {exercise.category === "strength" ? (
                <input
                  ref={weightRef}
                  type="number"
                  min={0}
                  step={0.5}
                  className="focus-ring w-full rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
                  value={input.weight}
                  onChange={(e) =>
                    onChange({ ...input, weight: Number(e.target.value) || 0 })
                  }
                />
              ) : (
                <div className="rounded-2xl border border-transparent px-3 py-2 text-sm font-bold text-ink/35 dark:text-cream/35">
                  BW
                </div>
              )}
            </div>
            )}
        </div>
        {onComplete && (
          <button
            className={`focus-ring mt-3 w-full rounded-2xl px-4 py-2 text-sm font-black ${
              completed
                ? "cursor-not-allowed bg-white text-plum/50 dark:bg-white dark:text-plum/50"
                : "bg-plum text-white"
            }`}
            disabled={completed}
            onClick={onComplete}
            type="button"
          >
            {completed ? "Completed" : "Complete exercise"}
          </button>
        )}
      </>
    </div>
  );
}
