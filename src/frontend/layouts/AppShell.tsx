import type { ReactNode } from "react";
import {
  BarChart3,
  Dumbbell,
  Flame,
  Home,
  Moon,
  Shield,
  Sun,
  Users,
  Utensils,
  User,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { canAccessAdmin } from "../../lib/privacy";
import { classNames } from "../../lib/format";
import type { FeatureFlags } from "../../types";

const appName =
  (import.meta.env.VITE_APP_NAME as string | undefined) ?? "Fitness Tracker";

// ── Mobile: 5 items ─────────────────────────────────────────────────────────
const mobileNavItems: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/workouts", label: "Train", icon: Dumbbell, feature: "workouts" },
  { to: "/nutrition", label: "Food", icon: Utensils, feature: "nutrition" },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/account", label: "Account", icon: User },
];

// ── Desktop sidebar nav ─────────────────────────────────────────────────────
const desktopNavItems: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/workouts", label: "Train", icon: Dumbbell, feature: "workouts" },
  { to: "/nutrition", label: "Food", icon: Utensils, feature: "nutrition" },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaderboard", icon: Users, feature: "friends" },
  { to: "/account", label: "Account", icon: User },
];

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  feature?: keyof FeatureFlags;
};

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, dark, setDark, signOut, state } = useApp();
  const navigate = useNavigate();
  const visibleDesktopItems = desktopNavItems.filter(
    (item) => !item.feature || state.featureFlags[item.feature],
  );
  const visibleMobileItems = mobileNavItems.filter(
    (item) => !item.feature || state.featureFlags[item.feature],
  );

  function logout() {
    signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen text-ink dark:text-cream">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-plum/10 bg-cream/95 p-4 dark:border-white/10 dark:bg-[#160229]/95 lg:flex">
        {/* Brand */}
        <div className="flex items-center justify-center py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-plum text-honey">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-base font-black text-plum dark:text-cream">
                {appName}
              </p>
            </div>
          </Link>
        </div>

        {/* Main nav */}
        <nav className="mt-7 flex-1 space-y-0.5">
          {visibleDesktopItems.map((item) => (
            <SideNavItem key={item.to} {...item} />
          ))}
          {canAccessAdmin(currentUser) && (
            <SideNavItem to="/admin" label="Admin" icon={Shield} />
          )}
        </nav>

        {/* Bottom: theme toggle */}
        <div className="border-t border-plum/10 pt-4 dark:border-white/10">
          <button
            className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black text-plum/60 hover:bg-plum/5 dark:text-cream/60 dark:hover:bg-white/10"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="mobile-safe-bottom px-4 py-4 lg:ml-64 lg:px-8 lg:py-8">
        {/* Mobile top bar: centered brand */}
        <header className="mb-5 flex items-center justify-center lg:hidden">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum text-honey">
              <Flame size={18} />
            </div>
            <p className="text-base font-black text-plum dark:text-cream">
              {appName}
            </p>
          </Link>
        </header>
        {children}
      </main>

      {/* ── Mobile bottom nav: 5 items ───────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-plum/10 bg-cream/95 px-3 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-1 dark:border-white/10 dark:bg-[#160229]/95 lg:hidden">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${visibleMobileItems.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleMobileItems.map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function SideNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Home;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        classNames(
          "focus-ring flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-black transition-colors",
          isActive
            ? "bg-plum text-white"
            : "text-plum hover:bg-plum/5 dark:text-cream dark:hover:bg-white/10",
        )
      }
    >
      <Icon size={18} /> {label}
    </NavLink>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof Home;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        classNames(
          "focus-ring flex flex-col items-center justify-center rounded-xl py-2 text-[0.65rem] font-black transition-colors",
          isActive ? "text-plum dark:text-cream" : "text-plum/60 dark:text-cream/60",
        )
      }
    >
      <Icon size={20} />
      <span className="mt-0.5">{label}</span>
    </NavLink>
  );
}
