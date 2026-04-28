import { Activity, BarChart3, Utensils, Weight } from "lucide-react";
import { EmptyState, MetricCard, Panel } from "../ui";
import { formatNumber, formatWeight } from "../../../lib/format";
import type { DerivedMetrics } from "../../app/AppContext";
import type { MeasurementEntry, UserProfile } from "../../../types";

interface FriendWeightPanelProps {
  canView: boolean;
  latestMeasurement: MeasurementEntry | undefined;
  friend: UserProfile;
  derived: DerivedMetrics | undefined;
}

export function FriendWeightPanel({
  canView,
  latestMeasurement,
  friend,
  derived,
}: FriendWeightPanelProps) {
  return (
    <Panel title="Current weight">
      {canView ? (
        latestMeasurement ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Weight}
              label="Current weight"
              value={formatWeight(latestMeasurement.weightKg, friend.units.weight)}
              accent="peach"
            />
            <MetricCard
              icon={BarChart3}
              label="BMI"
              value={derived ? formatNumber(derived.body.bmi, 1) : "-"}
              accent="rose"
            />
            <MetricCard
              icon={Utensils}
              label="Maintenance"
              value={derived ? `${derived.calories.maintenanceCalories} cal` : "-"}
              accent="honey"
            />
            <MetricCard
              icon={Activity}
              label="Protein target"
              value={derived ? `${derived.proteinTarget}g` : "-"}
              accent="peach"
            />
          </div>
        ) : (
          <EmptyState
            title="No measurement data"
            body="This friend has not logged a measurement yet."
          />
        )
      ) : (
        <EmptyState
          title="No access"
          body="Tell your friend to enable current weight in Privacy."
        />
      )}
    </Panel>
  );
}
