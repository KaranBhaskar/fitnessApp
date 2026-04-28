import { useState } from "react";
import type { ExerciseTemplate } from "../../../types";

export interface ExerciseSuggestion {
  exercise: ExerciseTemplate;
  sourceLabel?: string;
}

export type ExerciseTrackingMode = "timed" | "weighted" | "reps";

interface AddExerciseFormProps {
  newExerciseName: string;
  newExerciseSets: number;
  newExerciseReps: number;
  newExerciseDurationSeconds: number;
  newExerciseMode: ExerciseTrackingMode;
  newExerciseCategory: ExerciseTemplate["category"];
  suggestions?: ExerciseSuggestion[];
  onNameChange: (value: string) => void;
  onSetsChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onDurationSecondsChange: (value: number) => void;
  onModeChange: (value: ExerciseTrackingMode) => void;
  onCategoryChange: (value: ExerciseTemplate["category"]) => void;
  onPickSuggestion?: (exercise: ExerciseTemplate) => void;
  onAdd: () => void;
}

export function AddExerciseForm({
  newExerciseName,
  newExerciseSets,
  newExerciseReps,
  newExerciseDurationSeconds,
  newExerciseMode,
  newExerciseCategory,
  suggestions = [],
  onNameChange,
  onSetsChange,
  onRepsChange,
  onDurationSecondsChange,
  onModeChange,
  onCategoryChange,
  onPickSuggestion,
  onAdd,
}: AddExerciseFormProps) {
  const [open, setOpen] = useState(false);
  const query = newExerciseName.trim().toLowerCase();
  const filteredSuggestions = query
    ? suggestions
        .filter(({ exercise }) => exercise.name.toLowerCase().includes(query))
        .slice(0, 5)
    : [];

  if (!open) {
    return (
      <button
        className="focus-ring flex w-full items-center justify-center rounded-3xl border border-dashed border-plum/20 bg-white px-4 py-4 text-lg font-black text-plum dark:border-white/20 dark:bg-white dark:text-plum"
        onClick={() => setOpen(true)}
      >
        + Add exercise
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
      <p className="text-xs font-black uppercase text-ink/55 dark:text-cream/55">
        What do you want to do?
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          { mode: "weighted" as const, label: "Set × rep × weight" },
          { mode: "reps" as const, label: "Set × rep" },
          { mode: "timed" as const, label: "Set × time" },
        ].map((option) => (
          <button
            key={option.mode}
            className={`focus-ring rounded-2xl px-3 py-2 text-xs font-black ${
              newExerciseMode === option.mode
                ? "bg-plum text-white"
                : "bg-cream text-plum dark:bg-white dark:text-plum"
            }`}
            onClick={() => onModeChange(option.mode)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <input
          className="focus-ring rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum xl:col-span-2"
          value={newExerciseName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Exercise name"
        />
        <select
          className="focus-ring rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
          value={newExerciseCategory}
          onChange={(e) =>
            onCategoryChange(e.target.value as ExerciseTemplate["category"])
          }
        >
          <option value="strength">Strength</option>
          <option value="bodyweight">Bodyweight</option>
          <option value="cardio">Cardio</option>
          <option value="mobility">Mobility</option>
          <option value="core">Core</option>
        </select>
        <input
          type="number"
          min={1}
          className="focus-ring rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
          value={newExerciseSets}
          onChange={(e) => onSetsChange(Number(e.target.value) || 1)}
          placeholder="Sets"
        />
        {newExerciseMode === "timed" ? (
          <input
            type="number"
            min={1}
            className="focus-ring rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
            value={newExerciseDurationSeconds}
            onChange={(e) =>
              onDurationSecondsChange(Number(e.target.value) || 1)
            }
            placeholder="Seconds"
          />
        ) : (
          <input
            type="number"
            min={1}
            className="focus-ring rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-ink dark:border-white/15 dark:bg-white dark:text-plum"
            value={newExerciseReps}
            onChange={(e) => onRepsChange(Number(e.target.value) || 1)}
            placeholder="Reps"
          />
        )}
      </div>
      {filteredSuggestions.length > 0 && onPickSuggestion && (
        <div className="mt-3 rounded-2xl bg-cream p-2 dark:bg-white">
          <p className="px-1 pb-1 text-[0.6rem] font-black uppercase text-ink/45 dark:text-plum/45">
            Reuse from this plan
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map(({ exercise, sourceLabel }) => (
              <button
                key={`${exercise.id}-${sourceLabel ?? ""}`}
                className="focus-ring rounded-xl bg-white px-3 py-2 text-left text-xs font-black text-plum shadow-sm dark:bg-cream dark:text-plum"
                onClick={() => onPickSuggestion(exercise)}
                type="button"
              >
                {exercise.name}
                <span className="ml-1 font-bold opacity-55">
                  {exercise.sets}×
                  {exercise.durationSeconds
                    ? `${exercise.durationSeconds}s`
                    : exercise.maxReps ?? exercise.minReps ?? "reps"}
                  {sourceLabel ? ` · ${sourceLabel}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="focus-ring mt-3 rounded-2xl border border-plum/20 bg-white px-4 py-2 text-sm font-black text-plum dark:border-white/20 dark:bg-white dark:text-plum"
        onClick={() => {
          onAdd();
          setOpen(false);
        }}
      >
        Add to day
      </button>
      <button
        className="focus-ring ml-2 rounded-2xl px-4 py-2 text-sm font-black text-plum dark:text-cream"
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </div>
  );
}
