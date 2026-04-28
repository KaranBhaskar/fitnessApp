import { Navigate, Outlet } from "react-router-dom";
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
  const { currentUser } = useApp();
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
  const { currentUser } = useApp();
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
