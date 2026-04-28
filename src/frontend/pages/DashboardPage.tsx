import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dumbbell, Flame, Plus, Utensils } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { formatWeight } from "../../lib/format";
import { todayKey } from "../../lib/date";
import { kgToLb, lbToKg, round } from "../../lib/calculations";
import { WEEKLY_LOSS_KEY } from "./AccountPage";
import { TARGET_KEY } from "./ProgressPage";

const today = todayKey();

export function DashboardPage() {
  const { currentUser, state, userMeasurements, latestMeasurement, derived, dark, updateState } =
    useApp();
  const navigate = useNavigate();
  const user = currentUser!;
  const isUs = user.units.weight === "us";
  const unit = isUs ? "lb" : "kg";

  const nutrition = state.nutritionLogs.filter((e) => e.userId === user.id);
  const workouts = state.workoutLogs.filter((e) => e.userId === user.id);
  const todayNutrition = nutrition.find((l) => l.date === today);
  const todayWorkout = workouts.find((l) => l.date === today);

  // Workout plan for today
  const activePlan =
    state.workoutPlanTemplates?.find((t) => t.id === state.activeWorkoutPlanId)?.days ??
    state.workoutPlan;
  const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todaysPlan = activePlan[dayIndex] ?? activePlan[0];

  // Calories
  const weeklyLossKg = parseFloat(localStorage.getItem(WEEKLY_LOSS_KEY) ?? "0.5");
  const maintenanceCal = derived?.calories.maintenanceCalories;
  const dailyDeficit = Math.round((weeklyLossKg * 7700) / 7);
  const goalCal = maintenanceCal ? Math.max(1200, maintenanceCal - dailyDeficit) : null;
  const caloriesLogged = todayNutrition?.calories ?? 0;
  const caloriesLeft = goalCal ? Math.max(0, goalCal - caloriesLogged) : null;

  // Weight chart: last 14 measurements, current vs target
  const storedTargetKg = parseFloat(localStorage.getItem(TARGET_KEY) ?? "0");
  const targetWeightKg = storedTargetKg || (latestMeasurement?.weightKg ?? 70) - 5;
  const last14 = userMeasurements.slice(-14);
  const weightChartData = last14.map((m, i) => ({
    idx: i + 1,
    current: isUs ? round(kgToLb(m.weightKg), 1) : round(m.weightKg, 1),
    target: isUs ? round(kgToLb(targetWeightKg), 1) : round(targetWeightKg, 1),
  }));

  // Calorie chart: last 7 days
  const calChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const log = nutrition.find((n) => n.date === dateStr);
    return { day: i + 1, calories: log?.calories ?? null };
  });

  // Chart theme colors
  const weightLineColor = dark ? "#f0b429" : "#210440";
  const targetLineColor = dark ? "#4ade80" : "#16a34a";
  const calLineColor = dark ? "#f5efe6" : "#210440";
  const goalLineColor = dark ? "#4ade80" : "#16a34a";
  const mainLineColor = "#c08940";
  const gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(33,4,64,0.08)";
  const axisColor = dark ? "#c4b5d6" : "#7b6091";
  const tooltipStyle = {
    borderRadius: 12, fontWeight: 700, fontSize: 12,
    background: dark ? "#160229" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(33,4,64,0.15)"}`,
    color: dark ? "#f5efe6" : "#210440",
  };

  // Streak
  const streak = derived?.streaks.overallStreak ?? 0;
  const workoutStreak = derived?.streaks.workoutStreak ?? 0;
  const calStreak = derived?.streaks.calorieStreak ?? 0;

  return (
    <div className="space-y-4">

      {/* ── Streak hero ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-plum p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl">
            {streak > 0 ? "🔥" : "😴"}
          </div>
          <div>
            <p className="text-2xl font-black">{streak} day streak</p>
            <p className="mt-0.5 text-sm font-semibold opacity-65">
              {todaysPlan?.isRestDay
                ? "Rest day — recovery is training"
                : todayWorkout
                  ? `${todaysPlan?.focus ?? "Workout"} done ✓`
                  : todaysPlan?.focus ?? "Start today's workout"}
            </p>
          </div>
        </div>
        {/* Mini streak pills */}
        <div className="mt-4 flex gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5">
            <Dumbbell size={14} />
            <span className="text-xs font-black">{workoutStreak}d workout</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5">
            <Utensils size={14} />
            <span className="text-xs font-black">{calStreak}d food</span>
          </div>
        </div>
      </div>

      {/* ── Quick stats: weight · body · calories ───────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-plum/10 bg-white p-3 text-center dark:border-white/10 dark:bg-white/10">
          <p className="text-[0.6rem] font-black uppercase text-ink/45 dark:text-cream/45">Weight</p>
          <p className="mt-1 text-lg font-black text-plum dark:text-honey">
            {latestMeasurement ? formatWeight(latestMeasurement.weightKg, user.units.weight) : "—"}
          </p>
          <p className="text-[0.55rem] font-bold text-ink/40 dark:text-cream/40">latest</p>
        </div>
        <div className="rounded-2xl border border-plum/10 bg-white p-3 text-center dark:border-white/10 dark:bg-white/10">
          <p className="text-[0.6rem] font-black uppercase text-ink/45 dark:text-cream/45">BMI</p>
          <p className="mt-1 text-lg font-black text-plum dark:text-honey">
            {derived ? round(derived.body.bmi, 1) : "—"}
          </p>
          <p className="text-[0.55rem] font-bold text-ink/40 dark:text-cream/40">estimate</p>
        </div>
        <div className="rounded-2xl border border-plum/10 bg-white p-3 text-center dark:border-white/10 dark:bg-white/10">
          <p className="text-[0.6rem] font-black uppercase text-ink/45 dark:text-cream/45">Body fat</p>
          <p className="mt-1 text-lg font-black text-plum dark:text-honey">
            {derived ? `${round(derived.body.bodyFatPercentage, 1)}%` : "—"}
          </p>
          <p className="text-[0.55rem] font-bold text-ink/40 dark:text-cream/40">estimate</p>
        </div>
        <div className="rounded-2xl border border-plum/10 bg-white p-3 text-center dark:border-white/10 dark:bg-white/10">
          <p className="text-[0.6rem] font-black uppercase text-ink/45 dark:text-cream/45">Calories</p>
          <p className={`mt-1 text-lg font-black ${goalCal && caloriesLogged > goalCal ? "text-rose-500" : "text-plum dark:text-honey"}`}>
            {caloriesLogged || "—"}
          </p>
          <p className="text-[0.55rem] font-bold text-ink/40 dark:text-cream/40">today</p>
        </div>
        <div className="rounded-2xl border border-plum/10 bg-white p-3 text-center dark:border-white/10 dark:bg-white/10">
          <p className="text-[0.6rem] font-black uppercase text-ink/45 dark:text-cream/45">Remaining</p>
          <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
            {caloriesLeft != null ? caloriesLeft : "—"}
          </p>
          <p className="text-[0.55rem] font-bold text-ink/40 dark:text-cream/40">cal left</p>
        </div>
      </div>

      {/* ── Today's workout status + Log food button ─────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Workout card */}
        <Link
          to="/workouts"
          className="group flex items-center gap-4 rounded-3xl border border-plum/10 bg-white p-4 hover:border-plum/20 dark:border-white/10 dark:bg-white/10 dark:hover:border-white/20"
        >
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white ${todayWorkout ? "bg-emerald-500" : "bg-plum"}`}>
            <Dumbbell size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-plum dark:text-cream">
              {todayWorkout ? "Workout done ✓" : todaysPlan?.focus ?? "Train today"}
            </p>
            <p className="truncate text-xs font-semibold text-ink/55 dark:text-cream/55">
              {todayWorkout
                ? `${todayWorkout.sets.length} sets logged`
                : `${todaysPlan?.exercises.length ?? 0} movements`}
            </p>
          </div>
        </Link>

        {/* Log food quick button */}
        <Link
          to="/nutrition"
          className="group flex items-center gap-4 rounded-3xl border border-plum/10 bg-white p-4 hover:border-plum/20 dark:border-white/10 dark:bg-white/10 dark:hover:border-white/20"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-honey text-white">
            <Plus size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-plum dark:text-cream">Log food</p>
            <p className="truncate text-xs font-semibold text-ink/55 dark:text-cream/55">
              {todayNutrition
                ? `${caloriesLogged} cal logged today`
                : goalCal
                  ? `Goal: ${goalCal} cal`
                  : "Track your meals"}
            </p>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Weight chart ──────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-black text-plum dark:text-cream">Weight</p>
            <div className="flex gap-3 text-[0.6rem] font-black uppercase">
              <span style={{ color: weightLineColor }}>— Now</span>
              <span style={{ color: targetLineColor }}>– – Target</span>
            </div>
          </div>
          {weightChartData.length < 2 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-plum/20 text-xs font-semibold text-ink/40 dark:text-cream/40">
              Log 2+ measurements to see chart
            </div>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="idx" tick={false} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: axisColor }} />
                  <Tooltip
                    formatter={(v, n) => [v != null ? `${v} ${unit}` : "—", n === "current" ? "Weight" : "Target"]}
                    contentStyle={tooltipStyle}
                  />
                  <Line type="monotone" dataKey="target" stroke={targetLineColor} strokeWidth={2} strokeDasharray="5 3" dot={false} name="target" />
                  <Line type="monotone" dataKey="current" stroke={weightLineColor} strokeWidth={2.5}
                    dot={{ fill: weightLineColor, strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} name="current" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Calorie deficit chart (last 7 days) ───────────────────────── */}
        <div className="rounded-3xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-black text-plum dark:text-cream">Calorie intake</p>
            <div className="flex gap-3 text-[0.6rem] font-black uppercase">
              <span style={{ color: calLineColor }}>— Logged</span>
              {maintenanceCal && <span style={{ color: mainLineColor }}>— Maint.</span>}
              {goalCal && <span style={{ color: goalLineColor }}>— Goal</span>}
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" tick={false} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: axisColor }}
                  domain={[
                    (min: number) => Math.floor(min * 0.9),
                    (max: number) => Math.ceil(Math.max(max, maintenanceCal ?? 0) * 1.08),
                  ]}
                />
                <Tooltip
                  formatter={(v) => [v != null ? `${v} cal` : "No data"]}
                  contentStyle={tooltipStyle}
                />
                <Line type="monotone" dataKey="calories" stroke={calLineColor} strokeWidth={2.5}
                  dot={{ fill: calLineColor, strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} name="Calories" connectNulls />
                {maintenanceCal && (
                  <ReferenceLine y={maintenanceCal} stroke={mainLineColor} strokeWidth={1.5} strokeDasharray="5 3" />
                )}
                {goalCal && (
                  <ReferenceLine y={goalCal} stroke={goalLineColor} strokeWidth={1.5} strokeDasharray="4 4" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Calorie nudge ─────────────────────────────────────────────────── */}
      {todayNutrition && goalCal && (
        <div className={`rounded-2xl p-3 text-sm font-bold ${caloriesLogged > goalCal + 100 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"}`}>
          {caloriesLogged > goalCal + 100
            ? `${caloriesLogged - goalCal} cal over your goal today — aim lighter tomorrow.`
            : caloriesLeft && caloriesLeft > 0
              ? `${caloriesLeft} cal left to hit your daily goal — keep fueling.`
              : "On target today 👌"}
        </div>
      )}
    </div>
  );
}
