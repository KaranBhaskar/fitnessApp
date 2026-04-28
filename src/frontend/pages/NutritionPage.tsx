import { useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useApp } from "../app/AppContext";
import { Panel } from "../components/ui";
import { calculateProteinTarget } from "../../lib/calculations";
import { saveNutrition } from "../state/demoActions";
import { todayKey } from "../../lib/date";
import { WEEKLY_LOSS_KEY } from "./AccountPage";
import { useBackendActions } from "../backend/BackendActionsContext";
import {
  LineChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type MealSlot = "breakfast" | "brunch" | "lunch" | "snack" | "dinner" | "late_night";

const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast", brunch: "Brunch", lunch: "Lunch",
  snack: "Snack", dinner: "Dinner", late_night: "Late night",
};
const MEAL_ORDER: MealSlot[] = ["breakfast", "brunch", "lunch", "snack", "dinner", "late_night"];

interface MealEntry {
  id: string; slot: MealSlot; description: string; calories: number; proteinGrams: number;
}

const today = todayKey();

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

export function NutritionPage() {
  const { currentUser, state, derived, updateState, dark } = useApp();
  const backend = useBackendActions();
  const user = currentUser!;

  const allNutrition = state.nutritionLogs
    .filter((e) => e.userId === user.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slot, setSlot] = useState<MealSlot>("breakfast");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");

  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.proteinGrams, 0);
  const maintenance = derived?.calories.maintenanceCalories;
  // Goal = maintenance - daily deficit from weekly loss goal
  const weeklyLossKg = parseFloat(localStorage.getItem(WEEKLY_LOSS_KEY) ?? "0.5");
  const dailyDeficit = Math.round((weeklyLossKg * 7700) / 7); // kcal/day
  const goalCalories = maintenance ? Math.max(1200, maintenance - dailyDeficit) : null;
  const proteinTarget = derived
    ? calculateProteinTarget(state.measurements.find((m) => m.userId === user.id)?.weightKg ?? 74)
    : 125;

  // Chart theme colors — adapted for dark/light
  const lineColor = dark ? "#f5efe6" : "#210440"; // cream vs plum
  const maintenanceColor = "#c08940"; // honey — works in both
  const goalColor = dark ? "#4ade80" : "#16a34a"; // emerald

  function addMeal() {
    if (!description.trim() || !calories) return;
    const entry: MealEntry = {
      id: crypto.randomUUID(), slot, description: description.trim(),
      calories: Number(calories) || 0, proteinGrams: Number(protein) || 0,
    };
    let updated: MealEntry[];
    if (editingId) {
      updated = meals.map((m) => (m.id === editingId ? { ...entry, id: editingId } : m));
      setEditingId(null);
    } else {
      updated = [...meals, entry];
    }
    setMeals(updated);
    const newCal = updated.reduce((s, m) => s + m.calories, 0);
    const newProt = updated.reduce((s, m) => s + m.proteinGrams, 0);
    void backend.saveNutrition({
      date: selectedDate,
      calories: newCal,
      proteinGrams: newProt,
    });
    saveNutrition(user.id, selectedDate, newCal, newProt, updateState);
    setDescription(""); setCalories(""); setProtein(""); setSlot("breakfast");
  }

  function startEdit(m: MealEntry) {
    setEditingId(m.id); setSlot(m.slot); setDescription(m.description);
    setCalories(String(m.calories)); setProtein(String(m.proteinGrams));
  }

  function deleteMeal(id: string) {
    const updated = meals.filter((m) => m.id !== id);
    setMeals(updated);
    const updatedCalories = updated.reduce((s, m) => s + m.calories, 0);
    const updatedProtein = updated.reduce((s, m) => s + m.proteinGrams, 0);
    void backend.saveNutrition({
      date: selectedDate,
      calories: updatedCalories,
      proteinGrams: updatedProtein,
    });
    saveNutrition(user.id, selectedDate,
      updatedCalories,
      updatedProtein,
      updateState,
    );
  }

  // 7-day line chart data
  const days7 = last7Days();
  const chartData = days7.map((d) => {
    const log = allNutrition.find((n) => n.date === d);
    return { date: d.slice(5), calories: log?.calories ?? null };
  });

  const mealsBySlot = MEAL_ORDER.map((s) => ({
    slot: s, label: MEAL_LABELS[s],
    items: meals.filter((m) => m.slot === s),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Targets bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Today",
            value: String(totalCal),
            sub: "cal logged",
            over: maintenance ? totalCal > maintenance + 150 : false,
          },
          { label: "Protein", value: `${totalProtein}g`, sub: `/ ${proteinTarget}g target`, over: false },
          { label: "Goal", value: String(goalCalories ?? "—"), sub: `${weeklyLossKg === 0 ? "maintain" : `−${weeklyLossKg} kg/wk`}`, over: false },
        ].map(({ label, value, sub, over }) => (
          <div key={label} className="rounded-2xl border border-plum/10 bg-white p-3 text-center dark:border-white/10 dark:bg-white/10">
            <p className="text-[0.6rem] font-black uppercase text-ink/40 dark:text-cream/40">{label}</p>
            <p className={`mt-1 text-xl font-black ${over ? "text-rose-500" : "text-plum dark:text-honey"}`}>{value}</p>
            <p className="text-[0.6rem] font-bold text-ink/40 dark:text-cream/40">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        {/* Meal logger */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-plum/10 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-white/10">
            <Clock size={15} className="text-plum/40 dark:text-cream/40" />
            <input
              type="date"
              className="flex-1 bg-transparent text-sm font-bold text-ink dark:text-cream"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setMeals([]); }}
            />
          </div>

          <Panel title={editingId ? "Edit meal" : "Add a meal"}>
            <div className="space-y-3">
              {/* Meal slot pills */}
              <div className="flex flex-wrap gap-1.5">
                {MEAL_ORDER.map((s) => (
                  <button key={s}
                    className={`focus-ring rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${slot === s ? "bg-plum text-white" : "border border-plum/20 bg-plum/5 text-plum dark:border-white/20 dark:bg-white/15 dark:text-cream"}`}
                    onClick={() => setSlot(s)}>{MEAL_LABELS[s]}</button>
                ))}
              </div>
              <input
                className="focus-ring w-full rounded-2xl border border-plum/20 bg-white px-4 py-3 text-sm font-bold text-ink placeholder:text-ink/35 dark:border-white/25 dark:bg-white/15 dark:text-cream dark:placeholder:text-cream/35"
                placeholder="What did you eat? (e.g. banana, oats with milk…)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMeal()}
              />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Calories", val: calories, set: setCalories, ph: "e.g. 350" },
                  { label: "Protein (g)", val: protein, set: setProtein, ph: "e.g. 25" },
                ].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label className="mb-1 block text-[0.6rem] font-black uppercase text-ink/45 dark:text-cream/45">{label}</label>
                    <input type="number" min={0}
                      className="focus-ring w-full rounded-2xl border border-plum/20 bg-white px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink/35 dark:border-white/25 dark:bg-white/15 dark:text-cream dark:placeholder:text-cream/35"
                      placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-2xl bg-plum px-4 py-3 font-black text-white disabled:opacity-40"
                  onClick={addMeal} disabled={!description.trim() || !calories}>
                  <Plus size={17} /> {editingId ? "Save changes" : "Add meal"}
                </button>
                {editingId && (
                  <button
                    className="focus-ring rounded-2xl border border-plum/15 px-4 py-3 text-sm font-black text-plum dark:border-white/15 dark:text-cream"
                    onClick={() => { setEditingId(null); setDescription(""); setCalories(""); setProtein(""); }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </Panel>

          {/* Logged meals */}
          {meals.length > 0 ? (
            <div className="space-y-3">
              {mealsBySlot.map(({ slot: s, label, items }) => (
                <div key={s} className="rounded-3xl border border-plum/10 bg-white dark:border-white/10 dark:bg-white/10">
                  <div className="border-b border-plum/10 px-4 py-2 dark:border-white/10">
                    <p className="text-xs font-black uppercase text-plum/60 dark:text-cream/60">{label}</p>
                  </div>
                  {items.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-plum/5 dark:border-white/5 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-ink dark:text-cream">{m.description}</p>
                        <p className="text-xs font-bold text-ink/50 dark:text-cream/50">{m.calories} cal{m.proteinGrams > 0 ? ` · ${m.proteinGrams}g` : ""}</p>
                      </div>
                      <button className="p-1 text-plum/40 hover:text-plum dark:text-cream/40" onClick={() => startEdit(m)}><Pencil size={14} /></button>
                      <button className="p-1 text-rose-400/60 hover:text-rose-500" onClick={() => deleteMeal(m.id)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-plum px-4 py-3 text-white">
                <p className="font-black">Total</p>
                <p className="font-black">{totalCal} cal · {totalProtein}g protein</p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-plum/20 py-8 text-center">
              <p className="text-2xl">🍽</p>
              <p className="mt-2 text-sm font-semibold text-ink/50 dark:text-cream/50">
                No meals logged yet — add one above
              </p>
            </div>
          )}
        </div>

        {/* 7-day LINE chart + goal range */}
        <div className="space-y-3">
          <Panel title="Last 7 days">
            <div className="mb-4 flex flex-wrap gap-4 text-[0.65rem] font-black uppercase">
              <span style={{ color: lineColor }}>— Calories logged</span>
              <span style={{ color: maintenanceColor }}>— Maintenance</span>
              {goalCalories && <span style={{ color: goalColor }}>— Goal</span>}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(33,4,64,0.08)"} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: dark ? "#f5efe6" : "#210440" }} />
                  {/* Force Y domain to always include the maintenance line even if data is below it */}
                  <YAxis
                    tick={{ fontSize: 10, fill: dark ? "#f5efe6" : "#210440" }}
                    domain={[
                      (dataMin: number) => Math.floor(dataMin * 0.9),
                      (dataMax: number) => Math.ceil(Math.max(dataMax, (maintenance ?? 0)) * 1.08),
                    ]}
                  />
                  <Tooltip
                    formatter={(val) => val != null ? `${val} cal` : "No data"}
                    contentStyle={{ borderRadius: 12, fontWeight: 700, fontSize: 12, background: dark ? "#160229" : "#fff", border: "1px solid rgba(33,4,64,0.15)", color: dark ? "#f5efe6" : "#210440" }}
                  />
                  <Line type="monotone" dataKey="calories" stroke={lineColor} strokeWidth={2.5}
                    dot={{ fill: lineColor, r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls name="Calories" />
                  {maintenance && (
                    <ReferenceLine y={maintenance} stroke={maintenanceColor} strokeWidth={2} strokeDasharray="5 3"
                      label={{ value: "Maintenance", position: "insideTopRight", fontSize: 9, fontWeight: 700, fill: maintenanceColor }} />
                  )}
                  {goalCalories && (
                    <ReferenceLine y={goalCalories} stroke={goalColor} strokeWidth={1.5} strokeDasharray="4 4"
                      label={{ value: "Goal", position: "insideBottomRight", fontSize: 9, fontWeight: 700, fill: goalColor }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Yesterday vs today nudge */}
            {(() => {
              if (chartData.length < 2 || !maintenance) return null;
              const yd = chartData[chartData.length - 2];
              if (!yd.calories) return null;
              const diff = yd.calories - maintenance;
              return (
                <div className={`mt-3 rounded-2xl p-3 text-sm font-bold ${diff > 200 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"}`}>
                  {diff > 200
                    ? `Yesterday was ${diff} cal over maintenance — aim a bit lighter today.`
                    : `Yesterday was on track. Keep it up!`}
                </div>
              );
            })()}
          </Panel>

          {goalCalories && maintenance && (
            <div className="rounded-2xl border border-plum/10 bg-white p-4 dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/45">Your calorie goal</p>
              <p className="mt-1 text-2xl font-black text-plum dark:text-honey">
                {goalCalories} <span className="text-base font-bold">cal/day</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-ink/50 dark:text-cream/50">
                {weeklyLossKg === 0
                  ? `At maintenance (${maintenance} cal). Change your loss rate in Account.`
                  : `${dailyDeficit} cal below maintenance to lose ~${weeklyLossKg} kg/week. Change in Account.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
