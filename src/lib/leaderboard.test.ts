import { describe, expect, it } from "vitest";
import { buildLeaderboard, getRelationshipStatus } from "./leaderboard";
import type { Relationship, UserProfile, WorkoutLog } from "../types";

function user(id: string, name: string): UserProfile {
  return {
    id,
    name,
    email: `${id}@example.com`,
    role: "user",
    status: "approved",
    onboardingComplete: true,
    units: {
      weight: "metric",
      height: "metric",
      neck: "metric",
      waist: "metric",
      hip: "metric",
    },
    age: 18,
    sexForEstimate: "male",
    activityLevel: "moderate",
    goal: "fat_loss_strength",
    createdAt: "2026-04-20",
  };
}

function workout(userId: string, date: string): WorkoutLog {
  return {
    id: `${userId}-${date}`,
    userId,
    date,
    workoutDayId: "day",
    status: "completed",
    sets: [],
  };
}

describe("leaderboard", () => {
  it("shows public approved users and accepted friends", () => {
    const rows = buildLeaderboard({
      users: [user("u1", "A"), user("u2", "B")],
      currentUserId: "u1",
      relationships: [
        {
          id: "r1",
          requesterId: "u1",
          recipientId: "u2",
          tier: "friend",
          status: "accepted",
          visibility: {
            streakStatus: true,
            streakLength: false,
            workoutSummary: false,
            caloriesGoalStatus: false,
            proteinGoalStatus: false,
            currentWeight: false,
            weightTrendline: false,
            projections: false,
            bodyMeasurements: false,
          },
        },
      ],
      todayDateKey: "2026-04-26",
      workoutLogs: [
        workout("u1", "2026-04-26"),
        workout("u1", "2026-04-25"),
        workout("u2", "2026-04-26"),
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].userId).toBe("u1");
    expect(rows[0].rank).toBe(1);
    expect(rows[0].activeToday).toBe(true);
    expect(rows[0].streakLength).toBe(2);
  });

  it("shows non-friends when their leaderboard is public", () => {
    const rows = buildLeaderboard({
      users: [user("u1", "A"), user("u2", "B")],
      currentUserId: "u1",
      relationships: [],
      todayDateKey: "2026-04-26",
      workoutLogs: [workout("u1", "2026-04-26"), workout("u2", "2026-04-26")],
    });
    expect(rows.map((row) => row.userId)).toEqual(["u1", "u2"]);
    expect(rows.find((row) => row.userId === "u2")?.relationshipStatus).toBe(
      "none",
    );
  });

  it("reports relationship status for leaderboard actions", () => {
    const relationships: Relationship[] = [
      {
        id: "r1",
        requesterId: "u1",
        recipientId: "u2",
        tier: "friend",
        status: "pending",
        visibility: {
          streakStatus: true,
          streakLength: false,
          workoutSummary: false,
          caloriesGoalStatus: false,
          proteinGoalStatus: false,
          currentWeight: false,
          weightTrendline: false,
          projections: false,
          bodyMeasurements: false,
        },
      },
    ];
    expect(getRelationshipStatus("u1", "u1", relationships)).toBe("self");
    expect(getRelationshipStatus("u1", "u2", relationships)).toBe("requested");
    expect(getRelationshipStatus("u2", "u1", relationships)).toBe("incoming");
    expect(getRelationshipStatus("u1", "u3", relationships)).toBe("none");
  });

  it("keeps hidden users visible to friends", () => {
    const rows = buildLeaderboard({
      users: [
        { ...user("u1", "A"), leaderboardVisible: true },
        { ...user("u2", "B"), leaderboardVisible: false },
      ],
      currentUserId: "u1",
      relationships: [
        {
          id: "r1",
          requesterId: "u1",
          recipientId: "u2",
          tier: "friend",
          status: "accepted",
          visibility: {
            streakStatus: true,
            streakLength: false,
            workoutSummary: false,
            caloriesGoalStatus: false,
            proteinGoalStatus: false,
            currentWeight: false,
            weightTrendline: false,
            projections: false,
            bodyMeasurements: false,
          },
        },
      ],
      todayDateKey: "2026-04-26",
      workoutLogs: [workout("u1", "2026-04-26"), workout("u2", "2026-04-26")],
    });

    expect(rows.map((row) => row.userId)).toContain("u2");
  });

  it("hides private non-friends from the public leaderboard", () => {
    const rows = buildLeaderboard({
      users: [
        { ...user("u1", "A"), leaderboardVisible: true },
        { ...user("u2", "B"), leaderboardVisible: false },
      ],
      currentUserId: "u1",
      relationships: [],
      todayDateKey: "2026-04-26",
      workoutLogs: [workout("u1", "2026-04-26"), workout("u2", "2026-04-26")],
    });

    expect(rows.map((row) => row.userId)).toEqual(["u1"]);
  });
});
