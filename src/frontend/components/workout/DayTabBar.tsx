import { classNames } from "../../../lib/format";
import type { WorkoutDay, WorkoutLog } from "../../../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_ABBREV: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

function abbrev(name: string) {
  return DAY_ABBREV[name] ?? name.slice(0, 3);
}

function getDateForOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayEmoji(day: WorkoutDay): string {
  if (day.isRestDay || day.exercises.some((exercise) => exercise.category === "rest"))
    return "😴";
  const tags = new Set(day.tags ?? []);
  if (tags.has("full_body") || (tags.has("upper_body") && tags.has("lower_body")))
    return "🏋️";
  const focus = day.focus.toLowerCase();
  if (tags.has("upper_body") || focus.includes("upper")) return "💪";
  if (tags.has("lower_body") || focus.includes("lower")) return "🦵";
  if (focus.includes("full")) return "🏋️";
  if (tags.has("cardio") || day.exercises.some((exercise) => exercise.category === "cardio"))
    return "🏃";
  return "🏋️";
}

interface DayTabBarProps {
  activePlan: WorkoutDay[];
  todayIndex: number;
  dateOffset: number; // 0 = today, negative = past, positive = future
  workoutLogs: WorkoutLog[];
  onDateOffsetChange: (offset: number) => void;
}

const MAX_OFFSET = 30;

export function DayTabBar({
  activePlan,
  todayIndex,
  dateOffset,
  workoutLogs,
  onDateOffsetChange,
}: DayTabBarProps) {
  if (!activePlan.length) return null;

  const len = activePlan.length;
  function planDayAt(offset: number): WorkoutDay {
    const idx = ((todayIndex + offset) % len + len) % len;
    return activePlan[idx];
  }

  const currentDay = planDayAt(dateOffset);
  const currentDate = getDateForOffset(dateOffset);
  const loggedDates = new Set(
    workoutLogs
      .filter((log) => log.status === "completed" || log.status === "rest")
      .map((log) => log.date),
  );

  function go(delta: number) {
    const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dateOffset + delta));
    onDateOffsetChange(next);
  }

  return (
    <>
      {/* ── Mobile: single-day carousel ─────────────────────────────────── */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          className={classNames(
            "focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-colors",
            dateOffset <= -MAX_OFFSET
              ? "border-plum/10 text-plum/20 dark:border-white/10 dark:text-cream/20"
              : "border-plum/15 bg-white text-plum hover:bg-plum/5 dark:border-white/15 dark:bg-white/10 dark:text-cream",
          )}
          onClick={() => go(-1)}
          disabled={dateOffset <= -MAX_OFFSET}
          aria-label="Previous day"
        >
          <ChevronLeft size={20} />
        </button>

        <div
          className={classNames(
            "flex-1 rounded-2xl px-4 py-3 text-center transition-colors",
            dateOffset === 0
              ? "bg-plum text-white"
              : "border border-plum/15 bg-white text-plum dark:border-white/15 dark:bg-white/10 dark:text-cream",
          )}
        >
          <p
            className={classNames(
              "text-[0.6rem] font-black uppercase",
              dateOffset === 0 ? "opacity-70" : "opacity-50",
            )}
          >
            {dateOffset === 0 ? "Today" : dateOffset < 0 ? `${Math.abs(dateOffset)}d ago` : `In ${dateOffset}d`}
            {" · "}
            {abbrev(currentDay.dayName)}
            {" · "}
            {formatDateLabel(currentDate)}
            {" "}
            {dayEmoji(currentDay)}
          </p>
          <p className="mt-0.5 truncate font-black">
            {currentDay.focus}
          </p>
        </div>

        <button
          className={classNames(
            "focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition-colors",
            dateOffset >= MAX_OFFSET
              ? "border-plum/10 text-plum/20 dark:border-white/10 dark:text-cream/20"
              : "border-plum/15 bg-white text-plum hover:bg-plum/5 dark:border-white/15 dark:bg-white/10 dark:text-cream",
          )}
          onClick={() => go(1)}
          disabled={dateOffset >= MAX_OFFSET}
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Desktop: scrollable week view with arrows ────────────────────── */}
      <div className="hidden items-center gap-2 lg:flex">
        <button
          className={classNames(
            "focus-ring flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors",
            dateOffset === -MAX_OFFSET
              ? "border-plum/10 text-plum/20 dark:border-white/10 dark:text-cream/20"
              : "border-plum/15 bg-white text-plum hover:bg-plum/5 dark:border-white/15 dark:bg-white/10 dark:text-cream",
          )}
          onClick={() => go(-1)}
          disabled={dateOffset <= -MAX_OFFSET}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const off = dateOffset + i;
            const day = planDayAt(off);
            const d = getDateForOffset(off);
            const dateKey = d.toISOString().slice(0, 10);
            const isSelected = off === dateOffset;
            const isToday = off === 0;
            const clipped = off < -MAX_OFFSET || off > MAX_OFFSET;
            const isPast = off < 0;
            const isLogged = loggedDates.has(dateKey);
            const statusClass =
              !isSelected && isPast && isLogged
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200"
                : !isSelected && isPast
                  ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-200"
                  : "border border-plum/10 bg-white text-plum hover:bg-plum/5 dark:border-white/10 dark:bg-white dark:text-plum dark:hover:bg-cream";
            return (
              <button
                key={i}
                disabled={clipped}
                className={classNames(
                  "focus-ring min-w-0 rounded-2xl px-2 py-2 text-center text-sm transition-colors",
                  isSelected
                    ? "bg-plum text-white"
                    : clipped
                      ? "border border-plum/10 bg-white text-plum/25 dark:bg-white dark:text-plum/25"
                      : statusClass,
                )}
                onClick={() => !clipped && onDateOffsetChange(off)}
              >
                <span className="block text-lg leading-none">{dayEmoji(day)}</span>
                <span
                  className={classNames(
                    "mt-1 block text-[0.58rem] font-black uppercase",
                    isSelected ? "opacity-70" : "opacity-50",
                  )}
                >
                  {isToday ? "Today" : off < 0 ? `${Math.abs(off)}d ago` : `+${off}d`}
                </span>
                <span className="block truncate font-black">{abbrev(day.dayName)}</span>
                <span className="block truncate text-[0.6rem]">
                  {formatDateLabel(d)}
                </span>
              </button>
            );
          })}
        </div>

        <button
          className={classNames(
            "focus-ring flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors",
            dateOffset === MAX_OFFSET
              ? "border-plum/10 text-plum/20 dark:border-white/10 dark:text-cream/20"
              : "border-plum/15 bg-white text-plum hover:bg-plum/5 dark:border-white/15 dark:bg-white/10 dark:text-cream",
          )}
          onClick={() => go(1)}
          disabled={dateOffset >= MAX_OFFSET}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}
