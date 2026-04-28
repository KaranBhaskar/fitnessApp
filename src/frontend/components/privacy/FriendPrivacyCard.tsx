import { Lock } from "lucide-react";
import { Switch } from "../ui";
import type { AppState, Relationship, SharingVisibility, UserProfile } from "../../../types";
import { useBackendActions } from "../../backend/BackendActionsContext";

type UpdateState = (updater: (current: AppState) => AppState) => void;
type FriendField = keyof Omit<SharingVisibility, "streakStatus">;

const friendFields: FriendField[] = [
  "streakLength",
  "workoutSummary",
  "caloriesGoalStatus",
  "proteinGoalStatus",
  "currentWeight",
  "weightTrendline",
  "projections",
  "bodyMeasurements",
];

function humanize(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

interface FriendPrivacyCardProps {
  relationship: Relationship;
  friend: UserProfile | undefined;
  updateState: UpdateState;
}

export function FriendPrivacyCard({
  relationship,
  friend,
  updateState,
}: FriendPrivacyCardProps) {
  const backend = useBackendActions();

  function setAll(value: boolean) {
    const nextVisibility = {
      ...relationship.visibility,
      ...Object.fromEntries(friendFields.map((field) => [field, value])),
    };
    void backend.setFriendVisibility(relationship.id, nextVisibility);
    updateState((current) => ({
      ...current,
      relationships: current.relationships.map((candidate) =>
        candidate.id === relationship.id
          ? {
              ...candidate,
              visibility: nextVisibility,
            }
          : candidate,
      ),
    }));
  }

  function toggleField(field: FriendField) {
    const nextVisibility = {
      ...relationship.visibility,
      [field]: !relationship.visibility[field],
    };
    void backend.setFriendVisibility(relationship.id, nextVisibility);
    updateState((current) => ({
      ...current,
      relationships: current.relationships.map((candidate) =>
        candidate.id === relationship.id
          ? {
              ...candidate,
              visibility: nextVisibility,
            }
          : candidate,
      ),
    }));
  }

  return (
    <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-plum dark:text-cream">
            {friend?.name}
          </h3>
          <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/45">
            All fields are on by default. Streak stays on.
          </p>
        </div>
        <Lock size={20} className="text-plum dark:text-honey" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          className="focus-ring rounded-2xl bg-plum px-3 py-2 text-xs font-black uppercase text-white"
          onClick={() => setAll(true)}
        >
          Select all
        </button>
        <button
          className="focus-ring rounded-2xl border border-plum/10 px-3 py-2 text-xs font-black uppercase text-plum dark:border-white/10 dark:text-cream"
          onClick={() => setAll(false)}
        >
          Deselect all
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {friendFields.map((field) => (
          <label
            key={field}
            className="flex items-center justify-between rounded-2xl border border-plum/10 bg-cream p-3 text-sm font-bold dark:border-white/10 dark:bg-white/10"
          >
            <span>{humanize(field)}</span>
            <Switch
              enabled={relationship.visibility[field]}
              onChange={() => toggleField(field)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
