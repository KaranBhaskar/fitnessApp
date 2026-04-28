import { Activity, Flame, LineChart, Lock, Moon, Shield, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Footer } from "../layouts/Footer";
import { IconButton } from "../components/ui";
import { useApp } from "../app/AppContext";
import { signedInDestination } from "../app/routes";

const appName = (import.meta.env.VITE_APP_NAME as string | undefined) ?? "Fitness Tracker";

export function LandingPage() {
  const { authLoading, authMode, currentUser, dark, setDark, state } = useApp();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [authLoading]);

  if (authMode === "convex" && authLoading && !loadingTimedOut) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-plum dark:bg-[#160229] dark:text-cream">
        <div className="rounded-3xl border border-plum/10 bg-white p-5 text-sm font-black dark:border-white/10 dark:bg-white/10">
          Loading
        </div>
      </main>
    );
  }
  if (currentUser) {
    return <Navigate to={signedInDestination(currentUser, state)} replace />;
  }
  return (
    <main className="min-h-screen text-ink dark:text-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-plum text-honey">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-lg font-black tracking-normal">{appName}</p>
            <p className="text-xs font-bold uppercase text-plum/55 dark:text-cream/55">Private beta</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <IconButton label="Toggle theme" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <Link className="focus-ring rounded-2xl bg-plum px-5 py-3 text-sm font-black text-white" to="/sign-in">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:pt-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-plum/15 bg-white/70 px-4 py-2 text-sm font-black text-plum dark:border-white/10 dark:bg-white/10 dark:text-cream">
            <Shield size={16} /> Fitness streaks without pressure
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] text-plum dark:text-cream sm:text-7xl">
            Track training, nutrition, streaks, and honest progress.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-ink/70 dark:text-cream/70">
            A mobile-first fitness app for workouts, calories, protein, weight trends, projections, and privacy-controlled friend motivation.
          </p>
          <div className="mt-7">
            <Link className="focus-ring inline-flex rounded-2xl bg-plum px-7 py-4 font-black text-white" to="/sign-in">
              Start
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-[2.25rem] border-[7px] border-honey bg-honey p-3">
          <div className="rounded-[1.6rem] bg-white p-5 text-plum">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-plum/50">Today</p>
                <h2 className="text-2xl font-black text-plum">Upper strength</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-honey">
                <Flame size={24} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Workout", "6 day streak", "bg-peach"],
                ["Protein", "132g logged", "bg-rose"],
                ["Weight", "30d: 70.4kg", "bg-honey"],
                ["Privacy", "Friends only", "bg-cream"],
              ].map(([label, value, color]) => (
                <div key={label} className={`rounded-3xl border border-plum/10 ${color} p-4 text-plum`}>
                  <p className="text-xs font-black uppercase opacity-60">{label}</p>
                  <p className="mt-3 text-lg font-black">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-3xl bg-plum p-4 text-white">
              <p className="text-sm font-bold text-white/60">Friends can see</p>
              <p className="mt-2 text-2xl font-black">Streak active only</p>
              <div className="mt-4 h-3 rounded-full bg-white/15">
                <div className="h-3 w-3/4 rounded-full bg-honey" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Beta gate", "Approve users before they can use the app.", Shield],
          ["Smart logs", "Backdate workouts, rest days, calories, and protein.", Activity],
          ["Projections", "See 30-day, 3-month, and 1-year estimates.", LineChart],
          ["Privacy", "Share streaks by default and unlock deeper friend views by choice.", Lock],
        ].map(([title, text, Icon]) => (
          <div key={String(title)} className="rounded-3xl border border-plum/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/10">
            <Icon className="text-plum dark:text-honey" size={26} />
            <h3 className="mt-4 text-xl font-black">{title as string}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">{text as string}</p>
          </div>
        ))}
      </section>
      <Footer />
    </main>
  );
}
