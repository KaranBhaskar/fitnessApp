import { Flame } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../app/AppContext";
import { Footer } from "../layouts/Footer";
import { signedInDestination } from "../app/routes";

export function SignInPage() {
  const {
    authLoading,
    authMode,
    convexAuthenticated,
    currentUser,
    signInDemoGoogle,
    state,
  } = useApp();
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate to={signedInDestination(currentUser, state)} replace />;
  }

  if (authMode === "convex" && (authLoading || convexAuthenticated)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-plum dark:bg-[#160229] dark:text-cream">
        <div className="rounded-3xl border border-plum/10 bg-white p-5 text-sm font-black dark:border-white/10 dark:bg-white/10">
          Finishing sign in
        </div>
      </main>
    );
  }

  function demoSignIn() {
    signInDemoGoogle();
    navigate("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col text-ink dark:text-cream">
      <section className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-[2rem] border border-plum/10 bg-white p-6 dark:border-white/10 dark:bg-white/10">
          <Link className="mb-6 inline-block text-sm font-black text-plum dark:text-honey" to="/">
            Back
          </Link>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-plum text-honey">
            <Flame size={28} />
          </div>
          <h1 className="text-4xl font-black text-plum dark:text-cream">Sign in with Google</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
            Your Google email is saved to your backend profile. If it is in the owner allowlist, Convex assigns site-owner access automatically.
          </p>
          <div className="mt-6">
            {authMode === "convex" ? <ConvexGoogleButton /> : <GoogleButton onClick={demoSignIn} />}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ConvexGoogleButton() {
  const { signIn } = useAuthActions();
  return <GoogleButton onClick={() => void signIn("google")} />;
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="focus-ring flex w-full items-center justify-center gap-3 rounded-2xl bg-plum px-5 py-4 font-black text-white" onClick={onClick}>
      <GoogleLogo /> Continue with Google
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
