# Fitness Tracker

Mobile-first fitness tracker with Convex backend, Google OAuth via Convex Auth, admin beta gating, workout/nutrition tracking, streaks, projections, friend leaderboard sharing, and rate limiting. Google is the only sign-in provider in v1, and the Google email is saved on the backend profile.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in values once you have a Convex deployment:

   ```bash
   cp .env.example .env.local
   ```

3. Start Convex in one terminal:

   ```bash
   npm run convex:dev
   ```

4. Start the frontend in another terminal:

   ```bash
   npm run dev
   ```

Without `VITE_CONVEX_URL`, the frontend uses a single local Google-style sign-in path only during local development. Production builds render a configuration error if Convex is missing, so Vercel cannot accidentally ship demo mode.

## Google OAuth For Convex Auth

Create a Google OAuth web client in Google Cloud.

Development configuration:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `https://<deployment>.convex.site/api/auth/callback/google`

The Convex HTTP Actions URL is in the Convex dashboard under **Settings -> URL & Deploy Key -> Show development credentials**. It matches the deployment URL but ends in `.site` instead of `.cloud`.

Set Convex environment variables:

```bash
npx convex env set SITE_URL http://localhost:5173
npx convex env set AUTH_GOOGLE_ID <your-google-client-id>
npx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret>
npx convex env set OWNER_EMAIL_ALLOWLIST you@example.com
```

For production, set `SITE_URL` to the deployed frontend origin, for example:

```bash
npx convex env set SITE_URL https://your-project.vercel.app
```

For production, also add the production Vercel/custom-domain origin to Google and use the production Convex `.site` callback URL.

## Predeploy Check

Run the full local release check before shipping:

```bash
npm run predeploy
```

This runs the regression/backtest suite, production build, and high-severity dependency audit.

## Vercel Deployment

Use this build command so Vercel deploys Convex functions and then builds the frontend with the Vite-facing Convex URL:

```bash
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'npm run build'
```

Required Vercel environment variables:

- `CONVEX_DEPLOY_KEY`
- `VITE_CONVEX_URL` if your Vercel build is not being run by `convex deploy --cmd`

Required Convex environment variables:

- `SITE_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `OWNER_EMAIL_ALLOWLIST`

The app includes `vercel.json` so React Router pages like `/dashboard`, `/leaderboard`, and `/admin` refresh correctly on Vercel.

## Tests

```bash
npm run test
npm run backtest
```
