import { Dumbbell } from "lucide-react";
import { EmptyState, Panel } from "../ui";
import type { WorkoutLog } from "../../../types";

interface FriendWorkoutsPanelProps {
  canView: boolean;
  workouts: WorkoutLog[];
}

export function FriendWorkoutsPanel({
  canView,
  workouts,
}: FriendWorkoutsPanelProps) {
  return (
    <Panel title="Workouts">
      {canView ? (
        workouts.length ? (
          <div className="space-y-3">
            {workouts.slice(0, 5).map((workout) => (
              <div
                key={workout.id}
                className="flex items-start justify-between gap-3 rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10"
              >
                <div>
                  <p className="font-black text-plum dark:text-cream">
                    {workout.date}
                  </p>
                  <p className="text-sm font-semibold text-ink/60 dark:text-cream/60">
                    {workout.status} · {workout.sets.length} sets
                  </p>
                </div>
                <Dumbbell className="text-plum dark:text-honey" size={20} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No workouts yet"
            body="This friend has not logged a workout."
          />
        )
      ) : (
        <EmptyState
          title="No access"
          body="Tell your friend to enable workout summary in Privacy."
        />
      )}
    </Panel>
  );
}
