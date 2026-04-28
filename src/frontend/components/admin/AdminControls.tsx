import { Panel, Switch } from "../ui";
import { canManageAdmins } from "../../../lib/privacy";
import type { AppState, FeatureFlags, UserProfile } from "../../../types";
import { useBackendActions } from "../../backend/BackendActionsContext";

type UpdateState = (updater: (current: AppState) => AppState) => void;

const featureLabels: Record<keyof FeatureFlags, string> = {
  workouts: "Workouts",
  nutrition: "Nutrition",
  measurements: "Measurements",
  projections: "Projections",
  friends: "Leaderboard / friends",
  emojiReactions: "Emoji reactions",
  calorieStreaks: "Calorie streaks",
  proteinStreaks: "Protein streaks",
  onboardingRequired: "Require onboarding",
};

interface AdminControlsProps {
  state: AppState;
  currentUser: UserProfile;
  updateState: UpdateState;
}

export function AdminControls({ state, currentUser, updateState }: AdminControlsProps) {
  const backend = useBackendActions();
  const canToggleAppMode = canManageAdmins(currentUser);

  return (
    <Panel title="Admin controls">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <div>
            <p className="font-black text-plum dark:text-cream">Open signup</p>
            <p className="text-sm font-bold text-ink/55 dark:text-cream/55">
              {canToggleAppMode
                ? "Turn beta gate on/off."
                : "Site owner only."}
            </p>
          </div>
          <Switch
            enabled={state.appSettings.mode === "open"}
            disabled={!canToggleAppMode}
            onChange={() => {
              const mode = state.appSettings.mode === "open" ? "beta" : "open";
              void backend.setAppMode(mode);
              updateState((current) => ({
                ...current,
                appSettings: { mode },
              }));
            }}
          />
        </div>

        <div className="grid gap-2">
          {Object.entries(state.featureFlags).map(([key, enabled]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-2xl border border-plum/10 bg-white p-3 text-sm font-bold dark:border-white/10 dark:bg-white/10"
            >
              <span>{featureLabels[key as keyof FeatureFlags]}</span>
              <Switch
                enabled={enabled}
                onChange={() => {
                  const nextEnabled =
                    !state.featureFlags[key as keyof FeatureFlags];
                  void backend.setFeatureFlag(
                    key as keyof FeatureFlags,
                    nextEnabled,
                  );
                  updateState((current) => ({
                    ...current,
                    featureFlags: {
                      ...current.featureFlags,
                      [key]: nextEnabled,
                    },
                  }));
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </Panel>
  );
}
