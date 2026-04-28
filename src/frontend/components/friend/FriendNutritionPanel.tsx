import { Utensils } from "lucide-react";
import { EmptyState, MiniStat, Panel } from "../ui";
import type { NutritionLog } from "../../../types";

interface FriendNutritionPanelProps {
  canViewCalories: boolean;
  canViewProtein: boolean;
  latestNutrition: NutritionLog | undefined;
  nutrition: NutritionLog[];
}

export function FriendNutritionPanel({
  canViewCalories,
  canViewProtein,
  latestNutrition,
  nutrition,
}: FriendNutritionPanelProps) {
  if (!canViewCalories && !canViewProtein) {
    return (
      <Panel title="Nutrition">
        <EmptyState
          title="No access"
          body="Tell your friend to enable calories or protein in Privacy."
        />
      </Panel>
    );
  }

  return (
    <Panel title="Nutrition">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniStat
            label="Calories"
            value={
              canViewCalories
                ? latestNutrition
                  ? `${latestNutrition.calories}`
                  : "No log"
                : "No access"
            }
          />
          <MiniStat
            label="Protein"
            value={
              canViewProtein
                ? latestNutrition
                  ? `${latestNutrition.proteinGrams}g`
                  : "No log"
                : "No access"
            }
          />
        </div>
        {nutrition.length ? (
          <div className="space-y-3">
            {nutrition.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10"
              >
                <div>
                  <p className="font-black text-plum dark:text-cream">
                    {log.date}
                  </p>
                  <p className="text-sm font-semibold text-ink/60 dark:text-cream/60">
                    {log.calories} calories · {log.proteinGrams}g protein
                  </p>
                </div>
                <Utensils className="text-plum dark:text-honey" size={20} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No nutrition logs yet"
            body="This friend has not logged food yet."
          />
        )}
      </div>
    </Panel>
  );
}
