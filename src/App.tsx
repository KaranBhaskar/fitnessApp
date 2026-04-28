import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import type { AuthMode } from "./frontend/app/AppContext";
import { AppProvider } from "./frontend/app/AppContext";
import {
  RequireAdmin,
  RequireAuth,
  RequireFeature,
  RequireOnboarding,
} from "./frontend/app/routes";

const AdminPage = lazy(() =>
  import("./frontend/pages/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);
const AccountPage = lazy(() =>
  import("./frontend/pages/AccountPage").then((module) => ({
    default: module.AccountPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./frontend/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const FriendDetailPage = lazy(() =>
  import("./frontend/pages/FriendDetailPage").then((module) => ({
    default: module.FriendDetailPage,
  })),
);
const LeaderboardPage = lazy(() =>
  import("./frontend/pages/LeaderboardPage").then((module) => ({
    default: module.LeaderboardPage,
  })),
);
const LandingPage = lazy(() =>
  import("./frontend/pages/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const NutritionPage = lazy(() =>
  import("./frontend/pages/NutritionPage").then((module) => ({
    default: module.NutritionPage,
  })),
);
const OnboardingPage = lazy(() =>
  import("./frontend/pages/OnboardingPage").then((module) => ({
    default: module.OnboardingPage,
  })),
);
const NewPlanPage = lazy(() =>
  import("./frontend/pages/NewPlanPage").then((module) => ({
    default: module.NewPlanPage,
  })),
);
const PendingPage = lazy(() =>
  import("./frontend/pages/PendingPage").then((module) => ({
    default: module.PendingPage,
  })),
);
const PrivacyPage = lazy(() =>
  import("./frontend/pages/PrivacyPage").then((module) => ({
    default: module.PrivacyPage,
  })),
);
const ProgressPage = lazy(() =>
  import("./frontend/pages/ProgressPage").then((module) => ({
    default: module.ProgressPage,
  })),
);
const ProjectionsPage = lazy(() =>
  import("./frontend/pages/ProjectionsPage").then((module) => ({
    default: module.ProjectionsPage,
  })),
);
const SignInPage = lazy(() =>
  import("./frontend/pages/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);
const WorkoutPage = lazy(() =>
  import("./frontend/pages/WorkoutPage").then((module) => ({
    default: module.WorkoutPage,
  })),
);

export default function App({ authMode }: { authMode: AuthMode }) {
  return (
    <AppProvider authMode={authMode}>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            className:
              "!rounded-3xl !border !border-honey !bg-white !px-4 !py-3 !font-black !text-plum dark:!bg-plum dark:!text-cream",
            success: {
              iconTheme: {
                primary: "#FFBA00",
                secondary: "#210440",
              },
            },
          }}
        />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route element={<RequireOnboarding />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route element={<RequireFeature feature="workouts" />}>
                  <Route path="/workouts" element={<WorkoutPage />} />
                  <Route path="/workouts/plans/new" element={<NewPlanPage />} />
                </Route>
                <Route element={<RequireFeature feature="nutrition" />}>
                  <Route path="/nutrition" element={<NutritionPage />} />
                </Route>
                <Route path="/progress" element={<ProgressPage />} />
                <Route element={<RequireFeature feature="projections" />}>
                  <Route path="/projections" element={<ProjectionsPage />} />
                </Route>
                <Route element={<RequireFeature feature="friends" />}>
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route
                    path="/friends/:friendId"
                    element={<FriendDetailPage />}
                  />
                </Route>
                <Route
                  path="/friends"
                  element={<Navigate to="/leaderboard" replace />}
                />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream text-plum dark:bg-[#160229] dark:text-cream">
      <div className="rounded-3xl border border-plum/10 bg-white/80 px-5 py-4 text-sm font-black dark:border-white/10 dark:bg-white/10">
        Loading
      </div>
    </div>
  );
}
