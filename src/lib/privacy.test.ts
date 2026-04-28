import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessApp,
  canManageAdmins,
  friendDefaultVisibility,
  getVisibleFieldsForViewer,
  privateVisibility,
} from "./privacy";
import type { Relationship } from "../types";

describe("privacy and access policy", () => {
  it("keeps sharing private by default", () => {
    expect(getVisibleFieldsForViewer()).toEqual(privateVisibility);
  });

  it("lets friends see every sharing field by default", () => {
    const relationship: Relationship = {
      id: "r1",
      requesterId: "u1",
      recipientId: "u2",
      tier: "friend",
      status: "accepted",
      visibility: friendDefaultVisibility,
    };
    const visible = getVisibleFieldsForViewer(relationship);
    expect(Object.values(visible).every(Boolean)).toBe(true);
  });

  it("allows accepted friend access through explicit visibility", () => {
    const relationship: Relationship = {
      id: "r2",
      requesterId: "u1",
      recipientId: "u3",
      tier: "friend",
      status: "accepted",
      visibility: {
        ...privateVisibility,
        streakStatus: true,
        streakLength: true,
        workoutSummary: true,
        caloriesGoalStatus: true,
        proteinGoalStatus: true,
        currentWeight: true,
        weightTrendline: true,
        projections: true,
        bodyMeasurements: true,
      },
    };
    const visible = getVisibleFieldsForViewer(relationship);
    expect(visible.currentWeight).toBe(true);
    expect(visible.projections).toBe(true);
    expect(visible.bodyMeasurements).toBe(true);
  });

  it("blocks pending and suspended users from app access", () => {
    expect(canAccessApp({ status: "pending", role: "user" })).toBe(false);
    expect(canAccessApp({ status: "suspended", role: "super_admin" })).toBe(
      false,
    );
    expect(canAccessApp({ status: "approved", role: "user" })).toBe(true);
  });

  it("separates admin and super admin permissions", () => {
    expect(canAccessAdmin({ status: "approved", role: "admin" })).toBe(true);
    expect(canManageAdmins({ status: "approved", role: "admin" })).toBe(false);
    expect(canManageAdmins({ status: "approved", role: "super_admin" })).toBe(
      true,
    );
  });
});
