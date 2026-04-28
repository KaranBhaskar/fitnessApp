import { HeroStat, Panel } from "../ui";
import type { DerivedMetrics } from "../../app/AppContext";
import type { UserProfile } from "../../../types";

interface FriendStreakPanelProps {
  friend: UserProfile;
  derived: DerivedMetrics | undefined;
}

export function FriendStreakPanel({ friend, derived }: FriendStreakPanelProps) {
  return (
    <Panel title={`${friend.name}'s profile`}>
      <p className="max-w-3xl text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
        Friends always see your streak. Everything else shows only when you
        enable it in Privacy.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroStat
          label="Streak"
          value={derived ? `${derived.streaks.overallStreak}d` : "0d"}
        />
        <HeroStat
          label="Workout"
          value={derived ? `${derived.streaks.workoutStreak}d` : "0d"}
        />
        <HeroStat
          label="Calories"
          value={derived ? `${derived.streaks.calorieStreak}d` : "0d"}
        />
        <HeroStat
          label="Protein"
          value={derived ? `${derived.streaks.proteinStreak}d` : "0d"}
        />
      </div>
    </Panel>
  );
}
