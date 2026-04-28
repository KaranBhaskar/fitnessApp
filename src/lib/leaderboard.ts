import type { Relationship, UserProfile, WorkoutLog } from "../types";
import { addDays } from "./date";

export type LeaderboardRelationshipStatus =
  | "self"
  | "none"
  | "requested"
  | "incoming"
  | "friends";

export interface LeaderboardRow {
  userId: string;
  name: string;
  email: string;
  rank: number;
  activeToday: boolean;
  streakLength: number;
  workoutsThisWeek: number;
  score: number;
  relationshipStatus: LeaderboardRelationshipStatus;
}

export function buildLeaderboard(input: {
  users: UserProfile[];
  currentUserId: string;
  relationships: Relationship[];
  workoutLogs: WorkoutLog[];
  todayDateKey: string;
}): LeaderboardRow[] {
  const approvedUsers = input.users.filter(
    (user) => user.status === "approved",
  );
  const rows = approvedUsers.map((user) => {
    const relationshipStatus = getRelationshipStatus(
      input.currentUserId,
      user.id,
      input.relationships,
    );
    if (
      user.leaderboardVisible === false &&
      user.id !== input.currentUserId &&
      relationshipStatus !== "friends"
    ) {
      return undefined;
    }
    const userLogs = input.workoutLogs.filter(
      (log) =>
        log.userId === user.id &&
        (log.status === "completed" || log.status === "rest"),
    );
    const logDates = new Set(userLogs.map((log) => log.date));
    const streakLength = countBackwards(input.todayDateKey, (date) =>
      logDates.has(date),
    );
    const sevenDaysAgo = addDays(input.todayDateKey, -6);
    const workoutsThisWeek = userLogs.filter(
      (log) => log.date >= sevenDaysAgo && log.date <= input.todayDateKey,
    ).length;
    const activeToday = logDates.has(input.todayDateKey);

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      rank: 0,
      activeToday,
      streakLength,
      workoutsThisWeek,
      score: streakLength * 10 + workoutsThisWeek * 2 + (activeToday ? 5 : 0),
      relationshipStatus,
    };
  });

  return rows
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.streakLength - a.streakLength ||
        b.workoutsThisWeek - a.workoutsThisWeek ||
        a.name.localeCompare(b.name),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getRelationshipStatus(
  currentUserId: string,
  otherUserId: string,
  relationships: Relationship[],
): LeaderboardRelationshipStatus {
  if (currentUserId === otherUserId) return "self";
  const relationship = relationships.find(
    (candidate) =>
      [candidate.requesterId, candidate.recipientId].includes(currentUserId) &&
      [candidate.requesterId, candidate.recipientId].includes(otherUserId),
  );
  if (!relationship) return "none";
  if (relationship.status === "accepted") return "friends";
  if (
    relationship.status === "pending" &&
    relationship.requesterId === currentUserId
  )
    return "requested";
  if (
    relationship.status === "pending" &&
    relationship.recipientId === currentUserId
  )
    return "incoming";
  return "none";
}

function countBackwards(
  dateKey: string,
  predicate: (date: string) => boolean,
): number {
  let cursor = dateKey;
  let count = 0;
  while (predicate(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
    if (count > 730) break;
  }
  return count;
}
