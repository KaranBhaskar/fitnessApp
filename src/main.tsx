import React from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const root = createRoot(document.getElementById("root")!);

if (convexUrl) {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <React.StrictMode>
      <ConvexAuthProvider client={convex}>
        <App authMode="convex" />
      </ConvexAuthProvider>
    </React.StrictMode>,
  );
} else if (import.meta.env.DEV) {
  root.render(
    <React.StrictMode>
      <App authMode="demo" />
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 text-plum">
        <section className="max-w-md rounded-3xl border border-plum/10 bg-white p-6">
          <h1 className="text-2xl font-black">Convex is not configured</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-ink/70">
            Set VITE_CONVEX_URL in Vercel or deploy with the Convex build command
            before opening the production app.
          </p>
        </section>
      </main>
    </React.StrictMode>,
  );
}
