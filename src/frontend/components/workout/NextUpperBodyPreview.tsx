import type { UnitSystem, WorkoutDay, WorkoutLog } from "../../../types";
import { latestSetForExercise } from "../../state/demoActions";
import { kgToLb, round } from "../../../lib/calculations";

function displayWeight(weightKg: number, unit: UnitSystem) {
  return unit === "us"
    ? `${round(kgToLb(weightKg), 1)} lb`
    : `${round(weightKg, 1)} kg`;
}

interface NextUpperBodyPreviewProps {
  day: WorkoutDay;
  progressiveMode: boolean;
  progressionUnit: UnitSystem;
  workouts: WorkoutLog[];
}

export function NextUpperBodyPreview({
  day,
  progressiveMode,
  progressionUnit,
  workouts,
}: NextUpperBodyPreviewProps) {
  return (
    <div className="rounded-3xl bg-plum p-4 text-white">
      <p className="text-xs font-black uppercase text-white/60">
        Next upper body day
      </p>
      <h4 className="mt-1 text-lg font-black">
        {day.dayName}: {day.focus}
      </h4>
      <div className="mt-3 space-y-2">
        {day.exercises.map((exercise) => {
          const lastSet = latestSetForExercise(workouts, exercise.name);
          const increment =
            (exercise.incrementKg ?? 0) * (progressiveMode ? 2 : 1);
          const suggested =
            typeof lastSet?.weightKg === "number"
              ? lastSet.weightKg + increment
              : undefined;
          return (
            <div
              key={exercise.id}
              className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold"
            >
              {exercise.name}{" "}
              {suggested
                ? `- next ${displayWeight(suggested, progressionUnit)}`
                : "- no prior set yet"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
