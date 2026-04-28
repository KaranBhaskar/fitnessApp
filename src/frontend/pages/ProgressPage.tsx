import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../app/AppContext";
import { NumberField, Panel } from "../components/ui";
import { kgToLb, lbToKg, round } from "../../lib/calculations";
import { todayKey } from "../../lib/date";
import { createMeasurementEntry, saveMeasurement } from "../state/demoActions";
import { useBackendActions } from "../backend/BackendActionsContext";
import {
  latestMeasurementBefore,
  latestMeasurementOnOrBefore,
  requiresLargeWeightChangeConfirmation,
} from "../../lib/weightLog";

// Exported so DashboardPage and AccountPage share the same key
export const TARGET_KEY = "fitness_target_weight_kg";
export const START_WEIGHT_KEY = "fitness_start_weight_kg";

export function ProgressPage() {
  const { currentUser, userMeasurements, latestMeasurement, dark, updateState } = useApp();
  const backend = useBackendActions();
  const user = currentUser!;
  const isUs = user.units.weight === "us";
  const unit = isUs ? "lb" : "kg";
  const today = todayKey();
  const todaysMeasurement = userMeasurements.find((entry) => entry.date === today);
  const effectiveMeasurement =
    latestMeasurementOnOrBefore(userMeasurements, today) ?? latestMeasurement;
  const previousMeasurement = latestMeasurementBefore(userMeasurements, today);

  // ── Measurement form ────────────────────────────────────────────────────
  const [weight, setWeight] = useState(
    isUs ? round(kgToLb(effectiveMeasurement?.weightKg ?? 74.5), 1) : (effectiveMeasurement?.weightKg ?? 74.5),
  );
  const [height, setHeight] = useState(
    user.units.height === "us" ? round((effectiveMeasurement?.heightCm ?? 175) / 2.54, 1) : (effectiveMeasurement?.heightCm ?? 175),
  );
  const [neck, setNeck] = useState(
    user.units.neck === "us" ? round((effectiveMeasurement?.neckCm ?? 37) / 2.54, 1) : (effectiveMeasurement?.neckCm ?? 37),
  );
  const [waist, setWaist] = useState(
    user.units.waist === "us" ? round((effectiveMeasurement?.waistCm ?? 84) / 2.54, 1) : (effectiveMeasurement?.waistCm ?? 84),
  );
  const [hip, setHip] = useState(
    user.units.hip === "us" ? round((effectiveMeasurement?.hipCm ?? 94) / 2.54, 1) : (effectiveMeasurement?.hipCm ?? 94),
  );
  const storedStartKg = parseFloat(localStorage.getItem(START_WEIGHT_KEY) ?? "0");
  const firstWeightKg = userMeasurements[0]?.weightKg;
  const [startWeight, setStartWeight] = useState(
    isUs
      ? round(kgToLb(storedStartKg || firstWeightKg || 74.5), 1)
      : storedStartKg || firstWeightKg || 74.5,
  );
  const [saved, setSaved] = useState(false);

  function save() {
    const entry = createMeasurementEntry(user, {
      date: today,
      weight,
      height,
      neck,
      waist,
      hip,
    });
    const needsConfirmation = requiresLargeWeightChangeConfirmation({
      previousWeightKg: previousMeasurement?.weightKg,
      nextWeightKg: entry.weightKg,
    });
    if (
      needsConfirmation &&
      !window.confirm(
        "Are you sure this weight changed by 5 kg or more since your last entry? That is unusual for one day, but you can confirm if it is correct.",
      )
    ) {
      return;
    }
    void backend.saveMeasurement({
      date: entry.date,
      weightKg: entry.weightKg,
      heightCm: entry.heightCm,
      neckCm: entry.neckCm,
      waistCm: entry.waistCm,
      hipCm: entry.hipCm,
      confirmedLargeChange: needsConfirmation,
    });
    saveMeasurement(user, { date: today, weight, height, neck, waist, hip }, updateState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function saveStartWeight(value: number) {
    setStartWeight(value);
    localStorage.setItem(START_WEIGHT_KEY, String(isUs ? lbToKg(value) : value));
  }

  // ── Weight chart: last 14 measurements, current vs target ───────────────
  const storedTargetKg = parseFloat(localStorage.getItem(TARGET_KEY) ?? "0");
  const targetWeightKg = storedTargetKg || (latestMeasurement?.weightKg ?? 70) - 5;

  const last14 = userMeasurements.slice(-14);
  const chartData = last14.map((m, i) => ({
    idx: i + 1,
    current: isUs ? round(kgToLb(m.weightKg), 1) : round(m.weightKg, 1),
    target: isUs ? round(kgToLb(targetWeightKg), 1) : round(targetWeightKg, 1),
  }));

  // Progress bar: start → now → target
  const firstKg = storedStartKg || userMeasurements[0]?.weightKg;
  const latestKg = effectiveMeasurement?.weightKg;
  const startDisplay = firstKg != null ? (isUs ? round(kgToLb(firstKg), 1) : firstKg) : null;
  const currentDisplay = latestKg != null ? (isUs ? round(kgToLb(latestKg), 1) : latestKg) : null;
  const targetDisplay = isUs ? round(kgToLb(targetWeightKg), 1) : round(targetWeightKg, 1);
  const progressPct =
    startDisplay && currentDisplay && targetDisplay && startDisplay !== targetDisplay
      ? Math.max(0, Math.min(100, ((startDisplay - currentDisplay) / (startDisplay - targetDisplay)) * 100))
      : 0;

  // Theme colours
  const currentColor = dark ? "#f0b429" : "#210440";
  const targetColor  = dark ? "#4ade80" : "#16a34a";
  const gridColor    = dark ? "rgba(255,255,255,0.08)" : "rgba(33,4,64,0.08)";
  const axisColor    = dark ? "#c4b5d6" : "#7b6091";
  const tooltipStyle = {
    borderRadius: 12, fontWeight: 700, fontSize: 12,
    background: dark ? "#160229" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(33,4,64,0.15)"}`,
    color: dark ? "#f5efe6" : "#210440",
  };

  return (
    <div className="space-y-4">

      {/* ── Progress toward target ─────────────────────────────────────── */}
      {startDisplay && currentDisplay && (
        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Start", value: `${startDisplay} ${unit}`, color: "text-rose-400" },
              { label: "Now",   value: `${currentDisplay} ${unit}`, color: "text-plum dark:text-honey" },
              { label: "Target", value: `${targetDisplay} ${unit}`, color: "text-emerald-600 dark:text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[0.6rem] font-black uppercase text-ink/40 dark:text-cream/40">{label}</p>
                <p className={`text-base font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-plum/10 dark:bg-white/10">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-rose-400 to-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs font-black text-ink/40 dark:text-cream/40">
            {round(progressPct, 1)}% toward target
          </p>
        </div>
      )}

      <div className="grid gap-3 lg:hidden">
        <Link
          to="/leaderboard"
          className="focus-ring flex items-center gap-3 rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-honey text-plum">
            <Users size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-plum dark:text-cream">
              Leaderboard
            </span>
            <span className="block text-sm font-semibold text-ink/55 dark:text-cream/55">
              See active users and add friends.
            </span>
          </span>
        </Link>
        <Link
          to="/privacy"
          className="focus-ring flex items-center gap-3 rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-plum text-honey">
            <Lock size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-black text-plum dark:text-cream">
              What friends can see
            </span>
            <span className="block text-sm font-semibold text-ink/55 dark:text-cream/55">
              Start with all fields shared, then turn off anything.
            </span>
          </span>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/45">
            Today's weight source
          </p>
          <p className="mt-2 text-2xl font-black text-plum dark:text-honey">
            {effectiveMeasurement
              ? `${isUs ? round(kgToLb(effectiveMeasurement.weightKg), 1) : round(effectiveMeasurement.weightKg, 1)} ${unit}`
              : "—"}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink/55 dark:text-cream/55">
            {todaysMeasurement
              ? "Logged today."
              : effectiveMeasurement
                ? `Using your last entry from ${effectiveMeasurement.date}.`
                : "No weight logged yet."}
          </p>
        </div>
        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/45">
            Last 5 entries
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {userMeasurements.slice(-5).reverse().map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-cream p-3 dark:bg-white/10">
                <p className="text-[0.62rem] font-black uppercase text-ink/45 dark:text-cream/45">
                  {entry.date.slice(5)}
                </p>
                <p className="mt-1 font-black text-plum dark:text-honey">
                  {isUs ? round(kgToLb(entry.weightKg), 1) : round(entry.weightKg, 1)} {unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Weight chart ───────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-black text-plum dark:text-cream">
            Weight — last {last14.length} entries
          </p>
          <div className="flex gap-3 text-[0.6rem] font-black uppercase">
            <span style={{ color: currentColor }}>— Current</span>
            <span style={{ color: targetColor }}>– – Target</span>
          </div>
        </div>
        {chartData.length < 2 ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-plum/20 text-sm font-semibold text-ink/40 dark:text-cream/40">
            Log at least 2 measurements to see the chart
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="idx" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} />
                <Tooltip
                  formatter={(v, n) => [
                    v != null ? `${v} ${unit}` : "—",
                    n === "current" ? "Weight" : "Target",
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone" dataKey="target" stroke={targetColor}
                  strokeWidth={2} strokeDasharray="5 3" dot={false} name="target"
                />
                <Line
                  type="monotone" dataKey="current" stroke={currentColor}
                  strokeWidth={3} dot={{ fill: currentColor, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }} name="current"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Log measurement form ───────────────────────────────────────── */}
      <Panel title="Log measurement">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-plum dark:text-cream">
            Date
            <input
              className="rounded-2xl border-2 border-plum/10 bg-white px-4 py-3 text-ink disabled:bg-cream disabled:text-ink/70 dark:border-white/10 dark:bg-white dark:text-plum"
              value={today}
              disabled
            />
          </label>
          <NumberField label={`Weight (${unit})`} value={weight} setValue={setWeight} />
          <NumberField label={`Height (${user.units.height === "us" ? "in" : "cm"})`} value={height} setValue={setHeight} />
          <NumberField label={`Neck (${user.units.neck === "us" ? "in" : "cm"})`}   value={neck}   setValue={setNeck}   />
          <NumberField label={`Waist (${user.units.waist === "us" ? "in" : "cm"})`} value={waist}  setValue={setWaist}  />
          <NumberField label={`Hip (${user.units.hip === "us" ? "in" : "cm"})`}     value={hip}    setValue={setHip}    />
          <NumberField label={`Starting weight (${unit})`} value={startWeight} setValue={saveStartWeight} />
        </div>
        <button
          className="focus-ring mt-5 w-full rounded-2xl bg-plum px-5 py-4 font-black text-white"
          onClick={save}
        >
          {saved ? "✓ Saved!" : "Save measurement"}
        </button>
      </Panel>
    </div>
  );
}
