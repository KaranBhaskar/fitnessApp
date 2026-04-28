import { EmptyState, Panel } from "../ui";
import { WeightProjectionGrid } from "../shared/WeightProjectionGrid";
import { kgToLb, round } from "../../../lib/calculations";
import type { DerivedMetrics } from "../../app/AppContext";
import type { UserProfile } from "../../../types";

interface FriendTrendPanelProps {
  canView: boolean;
  derived: DerivedMetrics | undefined;
  friend: UserProfile;
}

export function FriendTrendPanel({
  canView,
  derived,
  friend,
}: FriendTrendPanelProps) {
  const weightRateUnit = friend.units.weight === "us" ? "lb/day" : "kg/day";

  return (
    <Panel title="Weight trend">
      {canView ? (
        derived?.projection ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
              <p className="text-sm font-black text-plum dark:text-cream">
                Current trend
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
                {derived.projection.trend === "decreasing"
                  ? "Their weight trend is moving down."
                  : derived.projection.trend === "increasing"
                    ? "Their weight trend is moving up."
                    : derived.projection.trend === "flat"
                      ? "Their weight trend is roughly flat."
                      : "Not enough logs yet to build a trend."}
              </p>
              {typeof derived.projection.dailyChangeKg === "number" && (
                <p className="mt-2 text-xs font-black uppercase text-plum/55 dark:text-cream/55">
                  {friend.units.weight === "us"
                    ? round(kgToLb(derived.projection.dailyChangeKg), 3)
                    : round(derived.projection.dailyChangeKg, 3)}{" "}
                  {weightRateUnit}
                </p>
              )}
            </div>
            <WeightProjectionGrid
              projections={derived.projection.projections}
              weightUnit={friend.units.weight}
            />
          </div>
        ) : (
          <EmptyState
            title="Not enough data yet"
            body="This friend needs at least two recent weigh-ins to build a trend."
          />
        )
      ) : (
        <EmptyState
          title="No access"
          body="Tell your friend to enable weight trendline in Privacy."
        />
      )}
    </Panel>
  );
}
