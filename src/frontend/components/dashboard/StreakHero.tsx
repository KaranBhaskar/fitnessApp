import { Flame } from "lucide-react";
import { HeroStat } from "../ui";
import type { DerivedMetrics } from "../../app/AppContext";
import type { WorkoutDay } from "../../../types";

interface StreakHeroProps {
  todaysPlan: WorkoutDay;
  derived: DerivedMetrics | undefined;
}

export function StreakHero({ todaysPlan, derived }: StreakHeroProps) {
  return (
    <div className="rounded-[2rem] bg-plum p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-white/60">Upcoming focus</p>
          <h2 className="mt-2 text-3xl font-black">{todaysPlan.focus}</h2>
          <p className="mt-2 text-sm font-bold text-white/65">
            {todaysPlan.exercises.length} movements planned
          </p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-honey">
          <Flame size={30} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeroStat
          label="Overall"
          value={`${derived?.streaks.overallStreak ?? 0}d`}
        />
        <HeroStat
          label="Workout"
          value={`${derived?.streaks.workoutStreak ?? 0}d`}
        />
        <HeroStat
          label="Calories"
          value={`${derived?.streaks.calorieStreak ?? 0}d`}
        />
        <HeroStat
          label="Protein"
          value={`${derived?.streaks.proteinStreak ?? 0}d`}
        />
      </div>
    </div>
  );
}
