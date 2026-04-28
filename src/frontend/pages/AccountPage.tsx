import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { ChevronDown, ChevronUp, Edit2, LogOut, Moon, Sun, User, X } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Switch } from "../components/ui";
import { getLeaderboardVisibility } from "../../lib/privacy";
import { lbToKg, kgToLb, round } from "../../lib/calculations";
import { FriendPrivacyCard } from "../components/privacy/FriendPrivacyCard";
import { TARGET_KEY } from "./ProgressPage";
import { useBackendActions } from "../backend/BackendActionsContext";

export const WEEKLY_LOSS_KEY = "fitness_weekly_loss_goal_kg";

const GOAL_LABELS: Record<string, string> = {
  fat_loss_strength: "Lose fat, build strength",
  strength: "Build strength",
  wellness: "General wellness",
};

const WEEKLY_OPTIONS: { label: string; value: number; note: string }[] = [
  { label: "Maintain", value: 0, note: "No deficit — stay at maintenance" },
  { label: "−0.25 kg/wk", value: 0.25, note: "~275 cal deficit/day — slow & sustainable" },
  { label: "−0.5 kg/wk", value: 0.5, note: "~550 cal deficit/day — recommended" },
  { label: "−0.75 kg/wk", value: 0.75, note: "~825 cal deficit/day — moderate" },
  { label: "−1 kg/wk", value: 1.0, note: "~1100 cal deficit/day — aggressive" },
];

export function AccountPage() {
  const { authMode, currentUser, state, updateState, dark, setDark, signOut } = useApp();
  const backend = useBackendActions();
  const navigate = useNavigate();

  const user = currentUser!;
  const units = user.units;
  const isUs = user.units.weight === "us";
  const leaderboardVisible = getLeaderboardVisibility(user);

  // ── Goals ──────────────────────────────────────────────────────────────
  const storedLossKg = parseFloat(localStorage.getItem(WEEKLY_LOSS_KEY) ?? "0.5");
  const [weeklyLossKg, setWeeklyLossKg] = useState(storedLossKg);
  const [lossExpanded, setLossExpanded] = useState(false);
  const currentLossOption = WEEKLY_OPTIONS.find((o) => o.value === weeklyLossKg) ?? WEEKLY_OPTIONS[2];

  // Target weight (for the charts on home page)
  const storedTargetKg = parseFloat(localStorage.getItem(TARGET_KEY) ?? "0");
  const [targetDisplay, setTargetDisplay] = useState(
    isUs ? round(kgToLb(storedTargetKg || 65), 1) : (storedTargetKg || 65),
  );
  function saveTarget(val: number) {
    setTargetDisplay(val);
    localStorage.setItem(TARGET_KEY, String(isUs ? lbToKg(val) : val));
  }

  // Profile
  const [goal, setGoal] = useState(user.goal);
  const [saved, setSaved] = useState(false);

  function saveProfile() {
    void backend.updateProfileSettings({ goal });
    updateState((current) => ({
      ...current,
      users: current.users.map((u) =>
        u.id === user.id ? { ...u, goal } : u,
      ),
    }));
    localStorage.setItem(WEEKLY_LOSS_KEY, String(weeklyLossKg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleUnit(field: keyof typeof units) {
    const nextUnits = {
      ...user.units,
      [field]: user.units[field] === "metric" ? "us" : "metric",
    };
    void backend.updateProfileSettings({ units: nextUnits });
    updateState((current) => ({
      ...current,
      users: current.users.map((u) =>
        u.id === user.id
          ? { ...u, units: nextUnits }
          : u,
      ),
    }));
  }

  function toggleLeaderboardVisible() {
    void backend.updateProfileSettings({
      leaderboardVisible: !leaderboardVisible,
    });
    updateState((current) => ({
      ...current,
      users: current.users.map((u) =>
        u.id === user.id
          ? { ...u, leaderboardVisible: !leaderboardVisible }
          : u,
      ),
    }));
  }

  function logout() {
    signOut();
    navigate("/");
  }

  // Friend relationships
  const relationships = state.relationships.filter((r) => {
    if (r.status !== "accepted") return false;
    return [r.requesterId, r.recipientId].includes(user.id);
  });
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-3xl bg-plum p-5 text-white">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <User size={28} />
        </div>
        <div>
          <p className="text-lg font-black">{user.name}</p>
          <p className="text-sm font-semibold opacity-60">{user.email}</p>
        </div>
      </div>

      {/* ── Goals ────────────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-3xl border border-plum/10 bg-white p-5 dark:border-white/10 dark:bg-white/10">
        <h2 className="text-lg font-black text-plum dark:text-cream">Goals</h2>

        {/* Weight loss rate — tap to expand */}
        <div>
          <p className="mb-2 text-xs font-black uppercase text-ink/50 dark:text-cream/50">
            Weight loss rate (drives your calorie goal)
          </p>
          <button
            className="flex w-full items-center justify-between rounded-2xl border border-plum/15 bg-plum/5 px-4 py-3 text-left dark:border-white/15 dark:bg-white/10"
            onClick={() => setLossExpanded((v) => !v)}
          >
            <div>
              <p className="font-black text-plum dark:text-cream">{currentLossOption.label}</p>
              <p className="text-xs font-semibold text-ink/55 dark:text-cream/55">{currentLossOption.note}</p>
            </div>
            {lossExpanded
              ? <ChevronUp size={18} className="flex-shrink-0 text-plum/50 dark:text-cream/50" />
              : <ChevronDown size={18} className="flex-shrink-0 text-plum/50 dark:text-cream/50" />}
          </button>
          {lossExpanded && (
            <div className="mt-1 space-y-0.5 rounded-2xl border border-plum/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-[#160229]">
              {WEEKLY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`w-full rounded-xl px-4 py-2.5 text-left transition-colors ${
                    weeklyLossKg === opt.value
                      ? "bg-plum text-white"
                      : "text-plum hover:bg-plum/5 dark:text-cream dark:hover:bg-white/10"
                  }`}
                  onClick={() => { setWeeklyLossKg(opt.value); setLossExpanded(false); }}
                >
                  <p className="font-black">{opt.label}</p>
                  <p className={`text-xs font-semibold ${weeklyLossKg === opt.value ? "opacity-70" : "opacity-50"}`}>
                    {opt.note}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Target weight (used in Home charts) */}
        <div>
          <p className="mb-2 text-xs font-black uppercase text-ink/50 dark:text-cream/50">
            Target weight (shown on Home chart)
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="w-full rounded-2xl border border-plum/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-white/10 dark:text-cream"
              value={targetDisplay}
              onChange={(e) => saveTarget(Number(e.target.value))}
            />
            <span className="text-sm font-bold text-ink/60 dark:text-cream/60">{isUs ? "lb" : "kg"}</span>
          </div>
        </div>

        {/* Goal type */}
        <div>
          <label className="mb-2 block text-xs font-black uppercase text-ink/50 dark:text-cream/50">
            Goal type
          </label>
          <select
            className="w-full rounded-2xl border border-plum/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-white/10 dark:text-cream"
            value={goal}
            onChange={(e) => setGoal(e.target.value as typeof goal)}
          >
            {Object.entries(GOAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-plum/10 bg-cream px-4 py-3 dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-black uppercase text-ink/50 dark:text-cream/50">
            Activity level
          </p>
          <p className="mt-1 font-black capitalize text-plum dark:text-cream">
            {user.activityLevel.replace("_", " ")}
          </p>
          <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-cream/50">
            Automatically updated from your active weekly plan and rest days.
          </p>
        </div>

        <button
          className="focus-ring w-full rounded-2xl bg-plum py-3 font-black text-white"
          onClick={saveProfile}
        >
          {saved ? "✓ Saved!" : "Save changes"}
        </button>
      </section>

      {/* ── Display & Units ───────────────────────────────────────────── */}
      <section className="space-y-3 rounded-3xl border border-plum/10 bg-white p-5 dark:border-white/10 dark:bg-white/10">
        <h2 className="text-lg font-black text-plum dark:text-cream">Display & Units</h2>

        {/* Dark mode */}
        <div className="flex items-center justify-between rounded-2xl border border-plum/10 bg-cream px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            {dark ? <Moon size={18} className="text-honey" /> : <Sun size={18} className="text-plum" />}
            <div>
              <p className="font-black text-plum dark:text-cream">Dark mode</p>
              <p className="text-xs font-semibold text-ink/50 dark:text-cream/50">
                {dark ? "On" : "Off"}
              </p>
            </div>
          </div>
          <Switch enabled={dark} onChange={() => setDark(!dark)} />
        </div>

        {/* Units */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(units) as [keyof typeof units, string][]).map(([field, unit]) => (
            <button
              key={field}
              className="flex items-center justify-between rounded-2xl border border-plum/10 bg-white px-4 py-3 hover:bg-plum/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              onClick={() => toggleUnit(field)}
            >
              <p className="text-sm font-black capitalize text-plum dark:text-cream">{field}</p>
              <span className="rounded-lg bg-plum px-2 py-1 text-xs font-black uppercase text-white">
                {unit === "metric" ? "kg/cm" : "lb/in"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────── */}
      <section className="space-y-3 rounded-3xl border border-plum/10 bg-white p-5 dark:border-white/10 dark:bg-white/10">
        <h2 className="text-lg font-black text-plum dark:text-cream">Privacy</h2>

        {/* Leaderboard visibility */}
        <div className="flex items-center justify-between rounded-2xl border border-plum/10 bg-cream px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div>
            <p className="font-black text-plum dark:text-cream">Public streak</p>
            <p className="text-xs font-semibold text-ink/50 dark:text-cream/50">
              Visible to non-friends in the leaderboard
            </p>
          </div>
          <Switch
            enabled={leaderboardVisible}
            onChange={toggleLeaderboardVisible}
          />
        </div>

        {/* Friend visibility — collapsed, expand per friend */}
        <div>
          <p className="mb-2 text-xs font-black uppercase text-ink/50 dark:text-cream/50">
            What friends can see
          </p>
          {relationships.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-plum/20 p-4 text-sm font-semibold text-ink/50 dark:text-cream/50">
              No friends yet — find people on the Leaderboard.
            </p>
          ) : (
            <div className="space-y-2">
              {relationships.map((r) => {
                const otherId = r.requesterId === user.id ? r.recipientId : r.requesterId;
                const other = state.users.find((u) => u.id === otherId);
                const shareCount = Object.values(r.visibility).filter(Boolean).length;
                const isOpen = expandedFriendId === r.id;

                return (
                  <div key={r.id} className="rounded-2xl border border-plum/10 dark:border-white/10">
                    {/* Collapsed header row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-plum/10 text-xs font-black text-plum dark:bg-white/15 dark:text-cream">
                        {other?.name?.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-plum dark:text-cream">{other?.name ?? "Friend"}</p>
                        <p className="text-xs font-semibold text-ink/50 dark:text-cream/50">
                          {shareCount} item{shareCount !== 1 ? "s" : ""} shared
                        </p>
                      </div>
                      <button
                        className="flex items-center gap-1.5 rounded-xl border border-plum/15 px-3 py-1.5 text-xs font-black text-plum transition-colors hover:bg-plum/5 dark:border-white/15 dark:text-cream dark:hover:bg-white/10"
                        onClick={() => setExpandedFriendId(isOpen ? null : r.id)}
                      >
                        {isOpen ? <X size={13} /> : <Edit2 size={13} />}
                        {isOpen ? "Close" : "Edit"}
                      </button>
                    </div>
                    {/* Expanded: all toggle options */}
                    {isOpen && (
                      <div className="border-t border-plum/10 px-4 pb-4 pt-3 dark:border-white/10">
                        <FriendPrivacyCard
                          relationship={r}
                          friend={other}
                          updateState={updateState}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Sign out ─────────────────────────────────────────────────── */}
      <div className="pb-4">
        {authMode === "convex" ? (
          <ConvexSignOut afterSignOut={logout} />
        ) : (
          <button
            className="focus-ring flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-600 px-5 py-4 font-black text-white transition-colors hover:bg-rose-700"
            onClick={logout}
          >
            <LogOut size={20} /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function ConvexSignOut({ afterSignOut }: { afterSignOut: () => void }) {
  const { signOut } = useAuthActions();
  return (
    <button
      className="focus-ring flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-600 px-5 py-4 font-black text-white transition-colors hover:bg-rose-700"
      onClick={() => void signOut().then(afterSignOut)}
    >
      <LogOut size={20} /> Sign out
    </button>
  );
}
