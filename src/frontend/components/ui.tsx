import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, EyeOff } from "lucide-react";
import { classNames } from "../../lib/format";

export function Panel({
  title,
  children,
  actionLabel,
  onAction,
  headerRight,
}: {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  headerRight?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-plum/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-plum dark:text-cream">{title}</h2>
        {headerRight}
        {!headerRight && actionLabel && (
          <button className="focus-ring flex items-center gap-1 rounded-2xl bg-honey px-3 py-2 text-sm font-black text-plum" onClick={onAction}>
            {actionLabel} <ChevronRight size={16} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  accent: _accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: "peach" | "rose" | "honey";
}) {
  return (
    <div className="rounded-3xl border border-plum/10 bg-white p-4 text-plum dark:border-white/10 dark:bg-white/10 dark:text-cream">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase opacity-65">{label}</p>
        <Icon className="text-plum dark:text-honey" size={20} />
      </div>
      <p className="mt-5 text-2xl font-black">{value}</p>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 dark:bg-white/10">
      <p className="text-xs font-black uppercase text-ink/45 dark:text-cream/45">{label}</p>
      <p className="mt-2 text-xl font-black text-plum dark:text-honey">{value}</p>
    </div>
  );
}

export function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/10 p-3">
      <p className="text-xs font-black uppercase text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-honey">{value}</p>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-cream p-5 text-center dark:bg-white/10">
      <EyeOff className="mx-auto text-plum dark:text-honey" size={28} />
      <h3 className="mt-3 font-black text-plum dark:text-cream">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink/60 dark:text-cream/60">{body}</p>
    </div>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="focus-ring flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-plum shadow-sm dark:bg-white/10 dark:text-honey"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Switch({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={classNames(
        "focus-ring flex h-7 w-12 items-center rounded-full p-1 transition",
        enabled ? "bg-honey" : "bg-plum/20 dark:bg-white/20",
        disabled && "cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
      onClick={disabled ? undefined : onChange}
      aria-pressed={enabled}
    >
      <span className={classNames("h-5 w-5 rounded-full bg-white shadow transition", enabled ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}

export function NumberField({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return (
    <label className="grid gap-2 text-sm font-black text-plum dark:text-cream">
      {label}
      <input
        className="rounded-2xl border-2 border-plum/10 bg-white px-4 py-3 text-ink dark:bg-white/10 dark:text-cream"
        type="number"
        step="0.1"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
    </label>
  );
}

export function AdminAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="focus-ring rounded-2xl bg-plum px-4 py-3 text-sm font-black text-white" onClick={onClick}>
      {label}
    </button>
  );
}
