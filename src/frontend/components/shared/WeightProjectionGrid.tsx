import { formatWeight } from "../../../lib/format";
import type { UnitSystem, WeightProjection } from "../../../types";

interface WeightProjectionGridProps {
  projections: WeightProjection[];
  weightUnit: UnitSystem;
}

export function WeightProjectionGrid({
  projections,
  weightUnit,
}: WeightProjectionGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {projections.map((item) => (
        <div key={item.label} className="rounded-3xl bg-plum p-5 text-white">
          <p className="text-sm font-black text-white/55">{item.label}</p>
          <p className="mt-4 text-3xl font-black text-honey">
            {formatWeight(item.projectedWeightKg, weightUnit)}
          </p>
        </div>
      ))}
    </div>
  );
}
