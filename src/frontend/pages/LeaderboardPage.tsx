import { Check, Flame, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { useMutation, useQuery } from "convex/react";
import { buildLeaderboard } from "../../lib/leaderboard";
import { todayKey } from "../../lib/date";
import { useApp } from "../app/AppContext";
import { EmptyState, MetricCard, Panel, Switch } from "../components/ui";
import { acceptFriendRequest, sendFriendRequest } from "../state/demoActions";
import { LeaderboardRow } from "../components/leaderboard/LeaderboardRow";
import { InviteByEmail } from "../components/leaderboard/InviteByEmail";
import {
  acceptFriendRef,
  leaderboardRef,
  requestEmailInviteRef,
  requestFriendRef,
} from "../backend/convexRefs";

export function LeaderboardPage() {
  const { authMode } = useApp();
  if (authMode === "convex") return <ConvexLeaderboardPage />;
  return <LocalLeaderboardPage />;
}

function LocalLeaderboardPage() {
  const { currentUser, state, updateState } = useApp();
  const user = currentUser!;
  const [searchTerm, setSearchTerm] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const rows = useMemo(
    () =>
      buildLeaderboard({
        users: state.users,
        currentUserId: user.id,
        relationships: state.relationships,
        workoutLogs: state.workoutLogs,
        todayDateKey: todayKey(),
      }),
    [state.relationships, state.users, state.workoutLogs, user.id],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (friendsOnly && row.relationshipStatus !== "friends" && row.relationshipStatus !== "self")
      return false;
    if (!normalizedSearch) return true;
    return [row.name, row.email].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    );
  });

  const friendsCount = state.relationships.filter(
    (r) =>
      r.status === "accepted" &&
      [r.requesterId, r.recipientId].includes(user.id),
  ).length;
  const activeTodayCount = filteredRows.filter((row) => row.activeToday).length;

  function draftInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    const subject = encodeURIComponent("Join my fitness leaderboard");
    const body = encodeURIComponent(
      "I added you to my fitness app friend list. Reply if you want to join the leaderboard and track progress with me.",
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  return (
    <LeaderboardSurface
      userId={user.id}
      rows={filteredRows}
      totalRows={filteredRows.length}
      activeTodayCount={activeTodayCount}
      friendsCount={friendsCount}
      searchTerm={searchTerm}
      friendsOnly={friendsOnly}
      inviteEmail={inviteEmail}
      onSearchChange={setSearchTerm}
      onFriendsOnlyToggle={() => setFriendsOnly((value) => !value)}
      onInviteEmailChange={setInviteEmail}
      onUseSearchText={() => setInviteEmail(searchTerm.trim())}
      onDraftInvite={draftInvite}
      onAdd={(recipientId) =>
        sendFriendRequest(user.id, recipientId, updateState)
      }
      onAccept={(requesterId) =>
        acceptFriendRequest(user.id, requesterId, updateState)
      }
    />
  );
}

function ConvexLeaderboardPage() {
  const { currentUser } = useApp();
  const user = currentUser!;
  const rows = useQuery(leaderboardRef) ?? [];
  const requestFriend = useMutation(requestFriendRef);
  const acceptFriend = useMutation(acceptFriendRef);
  const requestEmailInvite = useMutation(requestEmailInviteRef);
  const [searchTerm, setSearchTerm] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (
      friendsOnly &&
      row.relationshipStatus !== "friends" &&
      row.relationshipStatus !== "self"
    )
      return false;
    if (!normalizedSearch) return true;
    return [row.name, row.email].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    );
  });

  const friendsCount = rows.filter(
    (row) => row.relationshipStatus === "friends",
  ).length;
  const activeTodayCount = filteredRows.filter((row) => row.activeToday).length;

  function draftInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    void requestEmailInvite({
      email,
      note: "Leaderboard invite requested from the frontend.",
    });
    const subject = encodeURIComponent("Join my fitness leaderboard");
    const body = encodeURIComponent(
      "I added you to my fitness app friend list. Reply if you want to join the leaderboard and track progress with me.",
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  return (
    <LeaderboardSurface
      userId={user.id}
      rows={filteredRows}
      totalRows={filteredRows.length}
      activeTodayCount={activeTodayCount}
      friendsCount={friendsCount}
      searchTerm={searchTerm}
      friendsOnly={friendsOnly}
      inviteEmail={inviteEmail}
      onSearchChange={setSearchTerm}
      onFriendsOnlyToggle={() => setFriendsOnly((value) => !value)}
      onInviteEmailChange={setInviteEmail}
      onUseSearchText={() => setInviteEmail(searchTerm.trim())}
      onDraftInvite={draftInvite}
      onAdd={(recipientId) => void requestFriend({ recipientId })}
      onAccept={(requesterId) => void acceptFriend({ requesterId })}
    />
  );
}

interface LeaderboardSurfaceProps {
  userId: string;
  rows: Array<ComponentProps<typeof LeaderboardRow>["row"]>;
  totalRows: number;
  activeTodayCount: number;
  friendsCount: number;
  searchTerm: string;
  friendsOnly: boolean;
  inviteEmail: string;
  onSearchChange: (value: string) => void;
  onFriendsOnlyToggle: () => void;
  onInviteEmailChange: (value: string) => void;
  onUseSearchText: () => void;
  onDraftInvite: () => void;
  onAdd: (userId: string) => void;
  onAccept: (userId: string) => void;
}

function LeaderboardSurface({
  userId,
  rows,
  totalRows,
  activeTodayCount,
  friendsCount,
  searchTerm,
  friendsOnly,
  inviteEmail,
  onSearchChange,
  onFriendsOnlyToggle,
  onInviteEmailChange,
  onUseSearchText,
  onDraftInvite,
  onAdd,
  onAccept,
}: LeaderboardSurfaceProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Users} label="Approved users" value={`${totalRows}`} accent="peach" />
        <MetricCard icon={Flame} label="Active today" value={`${activeTodayCount}`} accent="honey" />
        <MetricCard icon={Check} label="Your friends" value={`${friendsCount}`} accent="rose" />
      </div>

      <Panel title="Leaderboard">
        <p className="mb-4 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
          Public ranking uses streak status, streak length, and weekly workout
          consistency. Search by name or email, or switch to friends only.
        </p>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-black text-plum dark:text-cream">
            Search people
            <input
              className="rounded-2xl border-2 border-plum/10 bg-white px-4 py-3 text-ink dark:bg-white/10 dark:text-cream"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by name or email"
            />
          </label>
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-plum/10 bg-cream px-4 py-3 dark:border-white/10 dark:bg-white/10">
            <p className="text-sm font-black text-plum dark:text-cream">Your friend</p>
            <Switch enabled={friendsOnly} onChange={onFriendsOnlyToggle} />
          </div>
        </div>

        <div className="space-y-3">
          {rows.length === 0 && searchTerm.trim() ? (
            <div className="space-y-4">
              <EmptyState
                title="No matching users"
                body="Try a different name or invite them by email."
              />
              <InviteByEmail
                inviteEmail={inviteEmail}
                searchTerm={searchTerm}
                onEmailChange={onInviteEmailChange}
                onDraftInvite={onDraftInvite}
                onUseSearchText={onUseSearchText}
              />
            </div>
          ) : (
            rows.map((row) => (
              <LeaderboardRow
                key={row.userId}
                row={row}
                currentUserId={userId}
                onAdd={() => onAdd(row.userId)}
                onAccept={() => onAccept(row.userId)}
              />
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
