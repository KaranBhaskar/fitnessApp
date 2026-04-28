import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ActivityLevel, WorkoutDay } from "../../types";
import { useApp } from "../app/AppContext";
import { Panel } from "../components/ui";
import { PlanSelector } from "../components/workout/PlanSelector";
import { useBackendActions } from "../backend/BackendActionsContext";

function inferActivityLevelFromPlan(days: WorkoutDay[]): ActivityLevel {
  const trainingDays = days.filter((day) => !day.isRestDay).length;
  if (trainingDays <= 2) return "light";
  if (trainingDays <= 5) return "moderate";
  if (trainingDays === 6) return "active";
  return "athlete";
}

export function NewPlanPage() {
  const { authMode, currentUser, state, updateState } = useApp();
  const backend = useBackendActions();
  const navigate = useNavigate();
  const user = currentUser!;
  const [planName, setPlanName] = useState("");

  function createPlan(name: string, days: WorkoutDay[]) {
    const trimmed = name.trim();
    if (!trimmed || !days.length) return;
    const inferredActivity = inferActivityLevelFromPlan(days);
    const activatePlan = (planId: string) => {
      updateState((current) => {
        const plan = {
          id: planId,
          name: trimmed,
          days,
          createdAt: new Date().toISOString(),
        };
        return {
          ...current,
          workoutPlanTemplates: [...(current.workoutPlanTemplates ?? []), plan],
          activeWorkoutPlanId: plan.id,
          workoutPlan: plan.days,
          users: current.users.map((candidate) =>
            candidate.id === user.id
              ? { ...candidate, activityLevel: inferredActivity }
              : candidate,
          ),
        };
      });
      navigate("/workouts");
    };

    if (authMode === "convex") {
      void backend.createWorkoutPlan(trimmed, days).then((planId) => {
        if (!planId) return;
        activatePlan(planId);
        void backend.updateProfileSettings({
          activityLevel: inferredActivity,
          activeWorkoutPlanId: planId,
        });
      });
      return;
    }

    const planId = crypto.randomUUID();
    activatePlan(planId);
    void backend.updateProfileSettings({
      activityLevel: inferredActivity,
      activeWorkoutPlanId: planId,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/workouts"
        className="inline-flex items-center gap-2 text-sm font-black text-plum dark:text-honey"
      >
        <ArrowLeft size={16} /> Back to training
      </Link>
      <Panel title="New weekly plan">
        <PlanSelector
          state={state}
          planName={planName}
          onPlanNameChange={setPlanName}
          onCreatePlan={createPlan}
          updateState={updateState}
          showBuilder
        />
      </Panel>
    </div>
  );
}
