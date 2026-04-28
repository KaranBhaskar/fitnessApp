import { Panel } from "../ui";
import { completeWorkoutToday } from "../../state/demoActions";
import type { AppState, UserProfile, WorkoutLog } from "../../../types";

type UpdateState = (updater: (current: AppState) => AppState) => void;

interface QuickWorkoutLogProps {
  todayWorkout: WorkoutLog | undefined;
  user: UserProfile;
  state: AppState;
  updateState: UpdateState;
  onOpenPlan: () => void;
}

export function QuickWorkoutLog({
  todayWorkout,
  user,
  state,
  updateState,
  onOpenPlan,
}: QuickWorkoutLogProps) {
  return (
    <Panel
      title="Quick workout log"
      actionLabel="Open plan"
      onAction={onOpenPlan}
    >
      <p className="text-sm font-semibold text-ink/60 dark:text-cream/60">
        {todayWorkout
          ? "Workout already logged today."
          : "Log today as completed or rest to keep streak math honest."}
      </p>
      <div className="mt-4 flex gap-3">
        <button
          className="focus-ring rounded-2xl bg-plum px-4 py-3 font-black text-white"
          onClick={() =>
            completeWorkoutToday(user, state, updateState, "completed")
          }
        >
          Complete
        </button>
        <button
          className="focus-ring rounded-2xl border border-plum/15 px-4 py-3 font-black text-plum dark:text-cream"
          onClick={() =>
            completeWorkoutToday(user, state, updateState, "rest")
          }
        >
          Rest day
        </button>
      </div>
    </Panel>
  );
}
