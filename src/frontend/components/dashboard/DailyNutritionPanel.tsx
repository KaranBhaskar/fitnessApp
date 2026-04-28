import { MiniStat, Panel } from "../ui";
import type { NutritionLog } from "../../../types";

interface DailyNutritionPanelProps {
  todayNutrition: NutritionLog | undefined;
}

export function DailyNutritionPanel({ todayNutrition }: DailyNutritionPanelProps) {
  return (
    <Panel title="Nutrition today">
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          label="Calories"
          value={todayNutrition ? `${todayNutrition.calories}` : "Missing"}
        />
        <MiniStat
          label="Protein"
          value={
            todayNutrition ? `${todayNutrition.proteinGrams}g` : "Missing"
          }
        />
      </div>
    </Panel>
  );
}
