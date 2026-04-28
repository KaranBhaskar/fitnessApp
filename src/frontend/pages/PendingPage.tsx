import { Bell, Lock } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../app/AppContext";

export function PendingPage() {
  const { authMode, currentUser, signOut } = useApp();
  const navigate = useNavigate();
  const suspended = currentUser?.status === "suspended";
  const handleLocalSignOut = () => {
    signOut();
    navigate("/");
  };
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="max-w-md rounded-[2rem] border border-plum/10 bg-white p-6 dark:border-white/10 dark:bg-white/10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-plum text-honey">
          {suspended ? <Lock size={26} /> : <Bell size={26} />}
        </div>
        <h1 className="mt-5 text-3xl font-black text-plum dark:text-cream">{suspended ? "Account paused" : "You are on the waitlist"}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-ink/65 dark:text-cream/65">
          {suspended
            ? "An admin has suspended this account. Protected features stay blocked until it is reactivated."
            : "Your Google account is signed in, but the app is in beta. An admin needs to approve access before tracking opens."}
        </p>
        {authMode === "convex" ? (
          <ConvexPendingSignOut afterSignOut={handleLocalSignOut} />
        ) : (
          <button
            className="focus-ring mt-6 rounded-2xl bg-plum px-5 py-4 font-black text-white"
            onClick={handleLocalSignOut}
          >
            Sign out
          </button>
        )}
      </section>
    </main>
  );
}

function ConvexPendingSignOut({ afterSignOut }: { afterSignOut: () => void }) {
  const { signOut } = useAuthActions();
  return (
    <button
      className="focus-ring mt-6 rounded-2xl bg-plum px-5 py-4 font-black text-white"
      onClick={() => void signOut().then(afterSignOut)}
    >
      Sign out
    </button>
  );
}
