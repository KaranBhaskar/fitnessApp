import { Lock } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Panel, Switch } from "../components/ui";
import { getLeaderboardVisibility } from "../../lib/privacy";
import { FriendPrivacyCard } from "../components/privacy/FriendPrivacyCard";
import { useBackendActions } from "../backend/BackendActionsContext";

export function PrivacyPage() {
  const { currentUser, state, updateState } = useApp();
  const backend = useBackendActions();
  const user = currentUser!;
  const leaderboardVisible = getLeaderboardVisibility(user);
  const relationships = state.relationships.filter((relationship) => {
    if (relationship.status !== "accepted") return false;
    if (![relationship.requesterId, relationship.recipientId].includes(user.id))
      return false;
    const otherId =
      relationship.requesterId === user.id
        ? relationship.recipientId
        : relationship.requesterId;
    const other = state.users.find((candidate) => candidate.id === otherId);
    return other?.status === "approved";
  });

  return (
    <div className="space-y-4">
      <Panel title="Friends">
        <p className="mb-4 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
          Friends start with every sharing field enabled. You can turn off
          anything sensitive per person from here.
        </p>
        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-plum dark:text-cream">
                Public streak on/off
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-ink/55 dark:text-cream/55">
                Turn this off if you do not want non-friends to see your streak
                in leaderboard search or rankings.
              </p>
            </div>
            <Switch
              enabled={leaderboardVisible}
              onChange={() => {
                void backend.updateProfileSettings({
                  leaderboardVisible: !leaderboardVisible,
                });
                updateState((current) => ({
                  ...current,
                  users: current.users.map((candidate) =>
                    candidate.id === user.id
                      ? { ...candidate, leaderboardVisible: !leaderboardVisible }
                      : candidate,
                  ),
                }));
              }}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase text-plum/50 dark:text-cream/50">
            <Lock size={14} /> Friends only visibility switch
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {relationships.length ? (
            relationships.map((relationship) => {
              const otherId =
                relationship.requesterId === user.id
                  ? relationship.recipientId
                  : relationship.requesterId;
              const other = state.users.find((candidate) => candidate.id === otherId);
              return (
                <FriendPrivacyCard
                  key={relationship.id}
                  relationship={relationship}
                  friend={other}
                  updateState={updateState}
                />
              );
            })
          ) : (
            <p className="text-sm font-semibold text-ink/60 dark:text-cream/60">
              No friends yet. Add a friend from the leaderboard to customize
              sharing.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
