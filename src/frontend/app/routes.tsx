import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { canAccessAdmin, canAccessApp } from "../../lib/privacy";
import { useApp } from "./AppContext";
import { AppShell } from "../layouts/AppShell";
import type { AppState, FeatureFlags, UserProfile } from "../../types";

export function signedInDestination(
  profile: UserProfile,
  state: Pick<AppState, "featureFlags">,
) {
  if (!canAccessApp(profile)) return "/pending";
  if (canAccessAdmin(profile)) return "/admin";
  if (state.featureFlags.onboardingRequired && !profile.onboardingComplete)
    return "/onboarding";
  return "/dashboard";
}

export function RequireAuth() {
  const { authLoading, currentUser } = useApp();
  if (authLoading) return <AuthLoading />;
  if (!currentUser) return <Navigate to="/sign-in" replace />;
  if (!canAccessApp(currentUser)) return <Navigate to="/pending" replace />;
  return <Outlet />;
}

export function RequireOnboarding() {
  const { currentUser, state } = useApp();
  if (!currentUser) return <Navigate to="/sign-in" replace />;
  if (state.featureFlags.onboardingRequired && !currentUser.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function RequireAdmin() {
  const { authLoading, currentUser } = useApp();
  if (authLoading) return <AuthLoading />;
  if (!canAccessAdmin(currentUser)) return <Navigate to="/dashboard" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function RequireFeature({ feature }: { feature: keyof FeatureFlags }) {
  const { state } = useApp();
  if (!state.featureFlags[feature]) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function AuthLoading() {
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (loadingTimedOut) return <Navigate to="/sign-in" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-plum dark:bg-[#160229] dark:text-cream">
      <div className="rounded-3xl border border-plum/10 bg-white/80 px-5 py-4 text-sm font-black dark:border-white/10 dark:bg-white/10">
        Finishing sign in
      </div>
    </div>
  );
}
