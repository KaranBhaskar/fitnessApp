import { Check, Flame, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import type { LeaderboardRelationshipStatus } from "../../../lib/leaderboard";

interface LeaderboardActionProps {
  status: LeaderboardRelationshipStatus;
  friendId: string;
  onAdd: () => void;
  onAccept: () => void;
}

export function LeaderboardAction({
  status,
  friendId,
  onAdd,
  onAccept,
}: LeaderboardActionProps) {
  if (status === "self")
    return (
      <span className="rounded-2xl border border-plum/10 px-4 py-3 text-center text-sm font-black text-plum/50 dark:border-white/10 dark:text-cream/50">
        You
      </span>
    );
  if (status === "friends")
    return (
      <Link
        to={`/friends/${friendId}`}
        className="rounded-2xl bg-plum px-4 py-3 text-center text-sm font-black text-white"
      >
        View friend
      </Link>
    );
  if (status === "requested")
    return (
      <span className="rounded-2xl border border-plum/10 px-4 py-3 text-center text-sm font-black text-plum dark:border-white/10 dark:text-cream">
        Requested
      </span>
    );
  if (status === "incoming") {
    return (
      <button
        className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-plum px-4 py-3 text-sm font-black text-white"
        onClick={onAccept}
      >
        <Check size={16} /> Accept
      </button>
    );
  }
  return (
    <button
      className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-plum px-4 py-3 text-sm font-black text-white"
      onClick={onAdd}
    >
      <UserPlus size={16} /> Add friend
    </button>
  );
}

interface LeaderboardRowProps {
  row: {
    userId: string;
    rank: number;
    name: string;
    email: string;
    streakLength: number;
    workoutsThisWeek: number;
    activeToday: boolean;
    relationshipStatus: LeaderboardRelationshipStatus;
  };
  currentUserId: string;
  onAdd: () => void;
  onAccept: () => void;
}

export function LeaderboardRow({
  row,
  currentUserId,
  onAdd,
  onAccept,
}: LeaderboardRowProps) {
  return (
    <div className="grid gap-3 rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-lg font-black text-white">
        #{row.rank}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-black text-plum dark:text-cream">
            {row.userId === currentUserId ? "You" : row.name}
          </h3>
          {row.activeToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-honey px-3 py-1 text-xs font-black text-plum">
              <Flame size={14} /> Active today
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-black uppercase tracking-wide text-ink/40 dark:text-cream/40">
          {row.email}
        </p>
        <p className="mt-1 text-sm font-bold text-ink/60 dark:text-cream/60">
          {row.streakLength} day streak · {row.workoutsThisWeek} workouts this
          week
        </p>
      </div>
      <LeaderboardAction
        status={row.relationshipStatus}
        friendId={row.userId}
        onAdd={onAdd}
        onAccept={onAccept}
      />
    </div>
  );
}
