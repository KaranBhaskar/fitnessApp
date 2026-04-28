import { Calendar } from "lucide-react";
import { EmptyState, Panel } from "../ui";
import { cmToIn, round } from "../../../lib/calculations";
import { formatWeight } from "../../../lib/format";
import type { MeasurementEntry, UserProfile } from "../../../types";

function formatMeasurementLength(
  valueCm: number,
  unit: "metric" | "us",
): string {
  return unit === "us"
    ? `${round(cmToIn(valueCm), 1)} in`
    : `${round(valueCm, 1)} cm`;
}

interface FriendMeasurementsPanelProps {
  canView: boolean;
  measurements: MeasurementEntry[];
  friend: UserProfile;
}

export function FriendMeasurementsPanel({
  canView,
  measurements,
  friend,
}: FriendMeasurementsPanelProps) {
  return (
    <Panel title="Measurements">
      {canView ? (
        measurements.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {measurements
              .slice(-6)
              .reverse()
              .map((measurement) => (
                <div
                  key={measurement.id}
                  className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-plum dark:text-cream">
                        {measurement.date}
                      </p>
                      <p className="text-sm font-semibold text-ink/60 dark:text-cream/60">
                        {formatWeight(measurement.weightKg, friend.units.weight)}
                      </p>
                    </div>
                    <Calendar className="text-plum dark:text-honey" size={20} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-ink/70 dark:text-cream/70">
                    <span>
                      Waist:{" "}
                      {formatMeasurementLength(
                        measurement.waistCm,
                        friend.units.waist,
                      )}
                    </span>
                    <span>
                      Neck:{" "}
                      {formatMeasurementLength(
                        measurement.neckCm,
                        friend.units.neck,
                      )}
                    </span>
                    <span>
                      Hip:{" "}
                      {measurement.hipCm
                        ? formatMeasurementLength(
                            measurement.hipCm,
                            friend.units.hip,
                          )
                        : "-"}
                    </span>
                    <span>
                      Height:{" "}
                      {formatMeasurementLength(
                        measurement.heightCm,
                        friend.units.height,
                      )}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="No measurements yet"
            body="This friend has not logged body measurements."
          />
        )
      ) : (
        <EmptyState
          title="No access"
          body="Tell your friend to enable body measurements in Privacy."
        />
      )}
    </Panel>
  );
}
