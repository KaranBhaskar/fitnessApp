import { describe, expect, it } from "vitest";
import { initialDemoState } from "../../data/demoState";
import type { AppState } from "../../types";
import {
  acceptFriendRequest,
  completeWorkoutToday,
  saveMeasurement,
  saveNutrition,
  sendFriendRequest,
  sendReaction,
  updateUserStatus,
} from "./demoActions";

function withState(
  action: (
    update: (updater: (current: AppState) => AppState) => void,
    state: AppState,
  ) => void,
) {
  let state: AppState = structuredClone(initialDemoState);
  const update = (updater: (current: AppState) => AppState) => {
    state = updater(state);
  };
  action(update, state);
  return state;
}

describe("demo frontend actions", () => {
  it("upserts nutrition logs by user and date", () => {
    const state = withState((update) =>
      saveNutrition("user-karan", "2026-04-26", 2200, 140, update),
    );
    const logs = state.nutritionLogs.filter(
      (log) => log.userId === "user-karan" && log.date === "2026-04-26",
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].calories).toBe(2200);
    expect(logs[0].proteinGrams).toBe(140);
  });

  it("stores US measurement input canonically as metric", () => {
    let state: AppState = structuredClone(initialDemoState);
    state.users = state.users.map((user) =>
      user.id === "user-karan"
        ? {
            ...user,
            units: {
              weight: "us",
              height: "us",
              neck: "us",
              waist: "us",
              hip: "us",
            },
          }
        : user,
    );
    const update = (updater: (current: AppState) => AppState) => {
      state = updater(state);
    };
    const user = state.users.find(
      (candidate) => candidate.id === "user-karan",
    )!;
    saveMeasurement(
      user,
      {
        date: "2026-04-27",
        weight: 165,
        height: 69,
        neck: 15,
        waist: 33,
        hip: 37,
      },
      update,
    );
    const entry = state.measurements.find(
      (measurement) => measurement.date === "2026-04-27",
    )!;
    expect(entry.weightKg).toBeCloseTo(74.84, 2);
    expect(entry.heightCm).toBeCloseTo(175.26, 2);
  });

  it("logs workout completion for today", () => {
    const state = withState((update, current) => {
      const user = current.users.find(
        (candidate) => candidate.id === "user-karan",
      )!;
      completeWorkoutToday(
        user,
        current,
        update,
        "completed",
        "monday-upper-strength",
      );
    });
    expect(state.workoutLogs[0].status).toBe("completed");
    expect(state.workoutLogs[0].sets.length).toBeGreaterThan(0);
  });

  it("sends and accepts friend requests from leaderboard actions", () => {
    let state: AppState = structuredClone(initialDemoState);
    state.relationships = state.relationships.filter(
      (relationship) => relationship.recipientId !== "pending-user",
    );
    const update = (updater: (current: AppState) => AppState) => {
      state = updater(state);
    };
    sendFriendRequest("user-karan", "pending-user", update);
    expect(state.relationships[0].status).toBe("pending");
    acceptFriendRequest("pending-user", "user-karan", update);
    expect(state.relationships[0].status).toBe("accepted");
  });

  it("limits emoji reactions to one per target per day", () => {
    let state: AppState = structuredClone(initialDemoState);
    const update = (updater: (current: AppState) => AppState) => {
      state = updater(state);
    };
    sendReaction("user-karan", "friend-1", update);
    sendReaction("user-karan", "friend-1", update);
    const reactions = state.reactions.filter(
      (reaction) =>
        reaction.fromUserId === "user-karan" &&
        reaction.toUserId === "friend-1",
    );
    expect(reactions).toHaveLength(1);
  });

  it("admin action updates user status and audit log", () => {
    const state = withState((update) =>
      updateUserStatus("pending-user", "approved", "owner", update),
    );
    expect(state.users.find((user) => user.id === "pending-user")?.status).toBe(
      "approved",
    );
    expect(state.auditEvents[0].action).toBe("set_status_approved");
  });
});
