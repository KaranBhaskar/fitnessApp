import { EmptyState, Panel } from "../ui";
import { WeightProjectionGrid } from "../shared/WeightProjectionGrid";
import type { DerivedMetrics } from "../../app/AppContext";
import type { UserProfile } from "../../../types";

interface FriendProjectionPanelProps {
  canView: boolean;
  derived: DerivedMetrics | undefined;
  friend: UserProfile;
}

export function FriendProjectionPanel({
  canView,
  derived,
  friend,
}: FriendProjectionPanelProps) {
  return (
    <Panel title="Projections">
      {canView ? (
        derived?.projection.projections.length ? (
          <WeightProjectionGrid
            projections={derived.projection.projections}
            weightUnit={friend.units.weight}
          />
        ) : (
          <EmptyState
            title="Not enough data yet"
            body="This friend needs at least two recent weigh-ins to build projections."
          />
        )
      ) : (
        <EmptyState
          title="No access"
          body="Tell your friend to enable projections in Privacy."
        />
      )}
    </Panel>
  );
}
