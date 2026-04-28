# Fitness Tracker Teammate Onboarding

This app is a mobile-first fitness tracker with a Vite/React frontend, Convex backend, Convex Auth with Google OAuth, beta-gated access, admin controls, workout/nutrition/measurement logging, projections, streaks, leaderboard/friends, and privacy controls.

The main design choice is that the app can run in two modes:

- `demo` mode when `VITE_CONVEX_URL` is missing in local development. This uses local in-memory demo state so the UI can be developed without real OAuth secrets.
- `convex` mode when `VITE_CONVEX_URL` exists. This uses Google sign-in, Convex Auth, Convex queries/mutations, and persisted backend data.

Production does not silently fall back to demo mode. If `VITE_CONVEX_URL` is missing in a production build, `src/main.tsx` renders a configuration error so Vercel cannot accidentally ship a fake local-only app.

## High-Level Map

```text
src/main.tsx
  Chooses demo vs Convex mode based on VITE_CONVEX_URL.

src/App.tsx
  React Router routes, protected layouts, global toast provider.

src/frontend/app/AppContext.tsx
  App-wide state, derived calculations, Convex sync bridge, Convex-to-frontend mapping.

src/frontend/backend/
  typed Convex references and a BackendActions wrapper used by pages.

src/frontend/pages/
  route-level screens: dashboard, workouts, progress, nutrition, leaderboard, admin, etc.

src/frontend/components/
  reusable UI and domain components.

src/lib/
  pure calculation/policy logic with tests.

src/data/
  demo/default state and default workout plan.

convex/
  Convex schema, auth, permissions, queries, mutations, rate limits.
```

## Frontend Routing

Routes live in `src/App.tsx`.

Protected route behavior lives in `src/frontend/app/routes.tsx`:

- `RequireAuth` sends signed-out users to `/sign-in`.
- `RequireAuth` sends pending/suspended users to `/pending`.
- `RequireOnboarding` sends first-time approved users to `/onboarding`.
- `RequireAdmin` protects `/admin`.

The shell navigation lives in `src/frontend/layouts/AppShell.tsx`.

Desktop keeps the sidebar. Mobile uses a smaller bottom nav and keeps leaderboard/privacy discovery under Progress to reduce clutter.

## Auth And Profile Flow

Google is the only real auth provider in v1.

Important files:

- `convex/auth.ts`: registers the Google provider with Convex Auth.
- `src/main.tsx`: wraps the app in `ConvexAuthProvider` only when `VITE_CONVEX_URL` exists.
- `src/frontend/pages/SignInPage.tsx`: renders the single Google sign-in action.
- `convex/profiles.ts`: creates or updates backend profiles.
- `convex/permissions.ts`: central auth, approval, admin, feature-flag checks.

Flow:

1. User clicks Google sign-in.
2. Convex Auth authenticates them.
3. `ConvexProfileBridge` in `AppContext` calls `profiles:ensureProfile`.
4. `ensureProfile` saves the Google email and name to `profiles`.
5. If the email is in `OWNER_EMAIL_ALLOWLIST`, the user becomes `super_admin` and `approved`.
6. If app mode is `open`, new users are approved.
7. Otherwise new users are `pending` until an admin approves them.

## Frontend-To-Backend Contract

Pages do not call Convex mutations directly in most places. They call `useBackendActions()`.

```text
Page
  -> useBackendActions()
  -> BackendActionsContext.tsx
  -> convexRefs.ts
  -> convex/*.ts function
  -> convex/schema.ts tables
```

Why this wrapper exists:

- The UI can run in demo mode with no backend.
- Convex calls stay centralized.
- Frontend payload shapes are easy to compare with backend validators.

When adding a backend function:

1. Add or update the Convex function in `convex/*.ts`.
2. Add/update the matching `makeFunctionReference` in `src/frontend/backend/convexRefs.ts`.
3. Add/update `BackendActionsContext.tsx` if pages should call it through the wrapper.
4. Map returned Convex records into frontend types in `AppContext.tsx`.
5. Add tests in `src/lib` or `src/frontend/state` when logic is pure or demo-state based.

## Data Model Notes

Shared frontend types live in `src/types.ts`.

Convex schema lives in `convex/schema.ts`.

Important alignment rules:

- Frontend IDs are strings because demo data and Convex IDs both arrive as strings.
- Convex mutations normalize/validate sensitive IDs before storing them.
- Workout logs are one per user per date in Convex.
- Measurement logs are restricted to today's date in Convex to reduce gaming.
- Large weight changes of 5 kg or more require explicit frontend confirmation and backend confirmation.

## Convex Schema Walkthrough

The canonical backend schema is in `convex/schema.ts`. The frontend-facing mirror types are in `src/types.ts`, but Convex is the source of truth once `VITE_CONVEX_URL` is configured.

The schema is intentionally split by product domain instead of storing one giant user document. That gives us:

- clean ownership checks with `userId`
- small query surfaces for each page
- append-friendly logs for history and streaks
- per-feature rate limiting and audit trails
- room to add features without reshaping every user record

### Shared Enums And Objects

Reusable validators at the top of `convex/schema.ts` keep status/role/unit values consistent across tables.

```ts
role: "super_admin" | "admin" | "user"
status: "pending" | "approved" | "suspended"
appMode: "beta" | "open"
unitSystem: "metric" | "us"
sexForEstimate: "male" | "female"
activityLevel: "sedentary" | "light" | "moderate" | "active" | "athlete"
goal: "fat_loss_strength" | "strength" | "wellness"
relationshipTier: "friend"
relationshipStatus: "pending" | "accepted" | "blocked"
```

`visibility` is a reusable object for friend privacy:

```ts
{
  streakStatus: boolean;
  streakLength: boolean;
  workoutSummary: boolean;
  caloriesGoalStatus: boolean;
  proteinGoalStatus: boolean;
  currentWeight: boolean;
  weightTrendline: boolean;
  projections: boolean;
  bodyMeasurements: boolean;
}
```

Why: privacy is not just a UI preference. It controls what a friend can view, so the object is stored directly on each relationship. This lets each friend have different permissions without creating a separate permissions table.

### Convex Auth Tables

```ts
...authTables
```

Why: Convex Auth owns its own user/session/account tables. We do not manually store OAuth tokens or passwords. Our app data links to Convex Auth users through `v.id("users")`.

### `profiles`

Main app profile for each authenticated user.

Key fields:

```ts
userId: v.id("users")
email?: string
name?: string
image?: string
leaderboardVisible?: boolean
role
status
onboardingComplete: boolean
units: { weight, height, neck, waist, hip }
age?: number
sexForEstimate?: "male" | "female"
activityLevel?: ActivityLevel
goal?: GoalType
activeWorkoutPlanId?: v.id("workoutPlans")
createdAt: number
updatedAt: number
```

Indexes:

```ts
by_user: ["userId"]
by_email: ["email"]
by_status: ["status"]
by_role: ["role"]
```

Why this shape:

- Convex Auth owns identity; `profiles` owns app-specific fields.
- `status` powers the beta gate: pending, approved, suspended.
- `role` powers admin and super-admin access.
- unit preferences live here because they are global user preferences.
- `activeWorkoutPlanId` persists the selected workout plan in Convex mode.
- `by_user` is the hot path for every signed-in request.
- `by_email` supports owner bootstrap and admin lookup.
- `by_status` makes pending approval lists cheap.
- `by_role` supports admin filtering.

### `appSettings`

Global app-level settings.

Fields:

```ts
key: string
mode?: "beta" | "open"
updatedAt: number
updatedBy?: v.id("users")
```

Index:

```ts
by_key: ["key"]
```

Why: app mode is global, not per-user. Today the key is mainly `"mode"`, but the table gives us a place for future singleton settings without redeploying a schema for each one.

### `featureFlags`

Server-enforced feature toggles.

Fields:

```ts
key: string
enabled: boolean
updatedAt: number
updatedBy?: v.id("users")
```

Index:

```ts
by_key: ["key"]
```

Why: feature flags are checked in Convex via `requireFeature`, not only hidden in the UI. That prevents disabled features from being called directly.

### `accessRequests`

Tracks user approval state over time.

Fields:

```ts
userId: v.id("users")
status
requestedAt: number
decidedAt?: number
decidedBy?: v.id("users")
```

Indexes:

```ts
by_user: ["userId"]
by_status: ["status"]
```

Why: this table separates the admin workflow from the user profile itself. `profiles.status` is the current truth; `accessRequests` supports queues and future approval history.

### `measurements`

Body measurement snapshots.

Fields:

```ts
userId: v.id("users")
date: string
weightKg: number
heightCm: number
neckCm: number
waistCm: number
hipCm?: number
createdAt: number
```

Index:

```ts
by_user_date: ["userId", "date"]
```

Why:

- all values are stored canonically in metric units, even if the UI displays pounds/inches.
- `date` is a `YYYY-MM-DD` string because daily health logs are date-based, not exact timestamp events.
- `by_user_date` lets us upsert one measurement per day and quickly fetch recent history.
- backend only allows today's weight entry and requires confirmation for large changes to reduce gaming.

### `nutritionLogs`

Daily calories and protein.

Fields:

```ts
userId: v.id("users")
date: string
calories: number
proteinGrams: number
createdAt: number
```

Index:

```ts
by_user_date: ["userId", "date"]
```

Why: nutrition is daily and can be backdated, so a one-record-per-user-per-date shape is simpler than timestamped meal logs for v1. It feeds calorie streaks, protein streaks, dashboard, and projections.

### `workoutPlans`

Top-level workout plan owned by a user.

Fields:

```ts
userId: v.id("users")
name: string
isDefault: boolean
createdAt: number
```

Index:

```ts
by_user: ["userId"]
```

Why: plans are separated from logs so users can edit routines without rewriting workout history. `isDefault` leaves room for backend-created defaults later.

### `planDays`

Ordered days inside a workout plan.

Fields:

```ts
userId: v.id("users")
planId: v.id("workoutPlans")
dayName: string
focus: string
order: number
isRestDay: boolean
```

Index:

```ts
by_plan: ["planId"]
```

Why: plan days are their own table so a plan can have a stable ordered weekly structure. `order` avoids depending on string day names for rendering.

### `planExercises`

Exercises inside each plan day.

Fields:

```ts
userId: v.id("users")
dayId: v.id("planDays")
name: string
sets: number
minReps?: number
maxReps?: number
durationSeconds?: number
incrementKg?: number
category: string
order: number
```

Index:

```ts
by_day: ["dayId"]
```

Why:

- exercises are separate from `planDays` because users can add many exercises and we want ordered retrieval.
- `minReps/maxReps` supports rep ranges.
- `durationSeconds` supports timed holds/cardio/core work.
- `incrementKg` supports progressive overload suggestions.
- `category` stays flexible because UI categories may expand faster than the schema.

### `workoutLogs`

One saved workout/rest/partial log per user per date.

Fields:

```ts
userId: v.id("users")
date: string
planDayId?: v.id("planDays")
status: "completed" | "rest" | "partial"
notes?: string
createdAt: number
```

Index:

```ts
by_user_date: ["userId", "date"]
```

Why:

- one workout log per date makes streak calculations and reset/overwrite behavior predictable.
- `partial` lets completing a single exercise autosave without pretending the full workout is done.
- `planDayId` links to the plan when a real Convex plan day exists.
- the mutation accepts a string from the frontend and normalizes it, because demo/default plan IDs are not Convex IDs.

### `exerciseSetLogs`

Individual set-level details for a workout log.

Fields:

```ts
userId: v.id("users")
workoutLogId: v.id("workoutLogs")
exerciseName: string
setNumber: number
reps?: number
weightKg?: number
durationSeconds?: number
completed: boolean
```

Index:

```ts
by_workout: ["workoutLogId"]
```

Why:

- set logs are split out so each workout can store variable numbers of sets.
- `exerciseName` is copied into the log intentionally, so history still reads correctly even if a plan exercise is renamed later.
- `weightKg` is canonical metric storage.
- `durationSeconds` supports timed sets such as Hollow hold.
- when a workout log is replaced, old set logs are deleted and recreated to keep the daily log simple.

### `streakSummaries`

Cached daily streak status.

Fields:

```ts
userId: v.id("users")
date: string
workoutComplete: boolean
calorieGoalMet: boolean
proteinGoalMet: boolean
overallMet: boolean
updatedAt: number
```

Index:

```ts
by_user_date: ["userId", "date"]
```

Why: the app currently calculates most streaks from logs, but this table gives us a future cache/materialized summary path for reminders, leaderboards, and historical daily status without recomputing everything.

### `relationships`

Friend relationships and per-friend visibility.

Fields:

```ts
requesterId: v.id("users")
recipientId: v.id("users")
tier: "friend"
status: "pending" | "accepted" | "blocked"
visibility: SharingVisibility
createdAt: number
updatedAt: number
```

Indexes:

```ts
by_requester: ["requesterId"]
by_recipient: ["recipientId"]
```

Why:

- relationships are directional while pending, but treated as mutual when accepted.
- both requester and recipient indexes are needed because either side can view their friend list.
- `visibility` lives on the relationship so each friend can have different permissions.
- accepted friends default to all visibility fields enabled, then the user can turn fields off.

### `reactions`

Emoji reactions for encouragement.

Fields:

```ts
fromUserId: v.id("users")
toUserId: v.id("users")
targetDate: string
emoji: string
createdAt: number
```

Indexes:

```ts
by_from_target_date: ["fromUserId", "toUserId", "targetDate"]
by_to: ["toUserId"]
```

Why: the product rule is one reaction per target per day. The compound index lets us check that quickly. `by_to` supports inbox/feed style displays later.

### `auditEvents`

Admin and security-sensitive actions.

Fields:

```ts
actorId: v.id("users")
targetUserId?: v.id("users")
action: string
metadata?: any
createdAt: number
```

Indexes:

```ts
by_actor: ["actorId"]
by_target: ["targetUserId"]
by_action: ["action"]
```

Why: admin actions need traceability. Keep using this table when adding new admin detail views or permission-changing actions.

### `usageEvents`

Feature usage telemetry inside the app.

Fields:

```ts
userId: v.id("users")
feature: string
createdAt: number
```

Indexes:

```ts
by_user_feature: ["userId", "feature"]
by_feature: ["feature"]
```

Why:

- admin dashboard can show what is being used.
- rate limiting and product analytics can share a simple event shape.
- this avoids putting counters on user profiles, which would be harder to reason about over time.

### `rateLimitEvents`

Backend rate-limit event log.

Fields:

```ts
actorId: v.id("users")
key: string
createdAt: number
```

Index:

```ts
by_actor_key: ["actorId", "key"]
```

Why: rate limits need to be enforced server-side. This table supports checking recent actions by actor and limit key, such as `logWrite`, friend requests, invites, search, and emoji reactions.

### Why Not One Big User Document?

This project deliberately avoids storing everything under `profiles` because:

- workout/nutrition/measurement history grows over time
- friend visibility belongs to relationships, not users
- plan editing should not rewrite workout history
- rate limits and audits are append-only operational logs
- admin queries need indexes by status, role, feature, and target

Separate tables are a little more verbose, but they make the backend safer to extend.

## Workouts

Important files:

- `src/frontend/pages/WorkoutPage.tsx`
- `src/frontend/components/workout/PlanSelector.tsx`
- `src/frontend/components/workout/ExerciseCard.tsx`
- `src/frontend/components/workout/AddExerciseForm.tsx`
- `convex/workouts.ts`
- `src/data/defaultPlan.ts`

Behavior:

- The app starts with a local default weekly plan.
- Users can create custom plans.
- Custom plans are saved in Convex when in Convex mode.
- Active plan selection is also persisted on the profile via `activeWorkoutPlanId`.
- Exercises can be tracked as:
  - set x rep x weight
  - set x rep
  - set x time
- Completing one exercise autosaves a partial workout.
- Completing the workout saves all exercises.
- Reset day clears saved progress for that day.

Why workout day IDs are handled carefully:

- A new Convex user might still be using the local default plan before creating a backend plan.
- `workouts:logWorkout` accepts a string `planDayId`, normalizes it to a real Convex `planDays` ID, and only stores it if the day belongs to the current user.
- The UI restores same-day completion state by date, so it does not break if plan day IDs are regenerated after a plan edit.

## Measurements, Progress, And Projections

Important files:

- `src/frontend/pages/ProgressPage.tsx`
- `convex/measurements.ts`
- `src/lib/weightLog.ts`
- `src/lib/projections.ts`
- `src/lib/calculations.ts`

Behavior:

- User logs weight only for today.
- If no weight was logged today, the UI carries forward the latest previous weight for display.
- Last five entries and starting weight are shown.
- BMI/body-fat estimates are calculated from measurements.
- Projection uses latest weight plus recent trend for 30 days, 3 months, and 1 year.

## Nutrition

Important files:

- `src/frontend/pages/NutritionPage.tsx`
- `convex/nutrition.ts`
- `src/lib/calculations.ts`
- `src/lib/streaks.ts`

Nutrition logs are date-based and can be backdated. Calories and protein feed the streak and target calculations.

## Friends, Leaderboard, And Privacy

Important files:

- `src/frontend/pages/LeaderboardPage.tsx`
- `src/frontend/pages/PrivacyPage.tsx`
- `src/frontend/components/privacy/FriendPrivacyCard.tsx`
- `convex/social.ts`
- `src/lib/privacy.ts`
- `src/lib/leaderboard.ts`

Current privacy decision:

- Non-friends can see public streak/leaderboard presence if `leaderboardVisible` is on.
- Accepted friends default to all sharing fields enabled.
- Users can turn off fields per friend.
- Streak status stays on for accepted friends.

Emoji reactions and friend/invite actions are rate-limited in Convex.

## Admin

Important files:

- `src/frontend/pages/AdminPage.tsx`
- `src/frontend/components/admin/*`
- `convex/admin.ts`
- `convex/permissions.ts`

Admin capabilities:

- Approve/suspend users.
- Promote/demote admins. Only `super_admin` can change roles.
- Toggle beta/open app mode.
- Toggle feature flags.
- View usage and audit events.

The first owner is bootstrapped from `OWNER_EMAIL_ALLOWLIST`. There is no public "continue as owner" UI; ownership comes from the signed-in Google email.

## Rate Limiting

Important files:

- `convex/rateLimit.ts`
- `src/lib/rateLimitPolicy.ts`

Protected actions include:

- repeated log writes
- workout plan writes
- friend requests
- invites
- searches
- emoji reactions

Current server-side buckets:

- `logWrite`: 80/hour for nutrition, measurements, and workout logs.
- `planWrite`: 5/hour for create/update workout plan, because plans can write many day/exercise rows.
- `friendRequest`: 6/hour.
- `inviteCreate`: 5/hour.
- `emojiReaction`: 12/hour.
- `profileSearch`: 30 per 10 minutes.

Old rate-limit rows are opportunistically deleted during new requests so the table does not grow forever for active users. Dashboard and projection queries also use bounded `take(...)` windows where practical to reduce read volume.

The pure rate-limit policy is tested in `src/lib/rateLimitPolicy.test.ts`.

## Styling And UX Decisions

- Tailwind CSS is used for styling.
- Palette follows the purple/peach/rose/honey direction from the reference.
- `lucide-react` provides icons.
- `react-hot-toast` provides workout completion feedback.
- Mobile is prioritized, but desktop keeps a quieter operational layout.

Workout-specific UX decisions:

- Active plan is collapsed at the top so plan creation does not dominate the page.
- Training units live beside the workout heading because unit switching affects exercise inputs, not plan selection.
- Completing an exercise disables its button until the user edits that exercise again.

## Environment Variables

`.env.example` lists the required variables:

```bash
CONVEX_DEPLOY_KEY=
VITE_CONVEX_URL=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
OWNER_EMAIL_ALLOWLIST=
VITE_APP_NAME=Fitness Tracker
```

Local development:

- `npm run convex:dev` writes local Convex deployment values such as `VITE_CONVEX_URL`.
- Without `VITE_CONVEX_URL`, the frontend intentionally falls back to demo mode.

Convex deployment variables:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `OWNER_EMAIL_ALLOWLIST`

Vercel variables:

- `CONVEX_DEPLOY_KEY`
- Usually not manually `VITE_CONVEX_URL` if using the Convex deploy command below, because the deploy command injects it for the build.

## Google OAuth Checklist

Development:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `https://<deployment>.convex.site/api/auth/callback/google`

Production:

- Add your Vercel/custom domain origin.
- Add the production Convex `.site` callback:
  `https://<production-deployment>.convex.site/api/auth/callback/google`

Set Convex env variables:

```bash
npx convex env set AUTH_GOOGLE_ID <google-client-id>
npx convex env set AUTH_GOOGLE_SECRET <google-client-secret>
npx convex env set OWNER_EMAIL_ALLOWLIST you@example.com
```

## Deploy Checklist

Before deploying:

```bash
npm run predeploy
```

This runs:

- regression/backtest suite
- TypeScript production build
- Vite production build
- high-severity `npm audit`

Vercel build command:

```bash
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'npm run build'
```

Why this command:

- Convex deploys backend functions/schema first.
- Convex injects the production deployment URL into `VITE_CONVEX_URL` for the Vite build.
- Vercel then serves the built frontend from `dist`.

Production setup steps:

1. Create or choose a Convex project and production deployment.
2. Generate a production deploy key in Convex.
3. Add `CONVEX_DEPLOY_KEY` to Vercel production environment variables.
4. Add Convex env vars for Google and owner allowlist.
5. Configure Google OAuth origins and callback URLs.
6. Set Vercel build command to:
   `npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'npm run build'`
7. Deploy from Vercel.
8. Sign in with the allowlisted Google owner email.
9. Confirm `/admin` is available.
10. Toggle beta/open mode as desired.

Official docs used for deployment assumptions:

- Convex with Vercel: https://docs.convex.dev/production/hosting/vercel
- Convex deploy keys: https://docs.convex.dev/cli/deploy-key-types
- Convex environment variables: https://docs.convex.dev/production/environment-variables
- Vercel environment variables: https://vercel.com/docs/environment-variables

## Common Confusing Things

### Why is there demo mode?

Demo mode keeps UI development possible without Google OAuth or a Convex deployment. It is selected only when `VITE_CONVEX_URL` is missing during local development. Production requires Convex configuration.

### Why do pages update local state and call backend?

The UI updates optimistically so it feels instant. Backend calls persist the same action in Convex. When Convex sends a fresh dashboard summary, `AppContext` reconciles the real backend data back into the frontend state.

### Why are there pure `src/lib` tests instead of only UI tests?

Most risk is in calculations and policy:

- body metrics
- projections
- streaks
- privacy
- leaderboard visibility
- rate limits
- weight-change guardrails

These are easier and safer to test as pure functions.

### Why are feature flags checked in Convex too?

Hiding UI is not enough. Backend functions call `requireFeature` so disabled features are blocked server-side.

### Why can admin see full user data?

Admin views are part of the product requirement. Full user-data views should be audit logged; keep that pattern when adding new admin detail surfaces.

## Adding A New Feature

1. Add domain types in `src/types.ts` if shared.
2. Add backend schema/function in `convex/`.
3. Add function reference in `src/frontend/backend/convexRefs.ts`.
4. Add wrapper method in `BackendActionsContext.tsx`.
5. Add page or component under the relevant frontend domain folder.
6. Add pure tests in `src/lib` when there is calculation/policy logic.
7. Run `npm run predeploy`.
