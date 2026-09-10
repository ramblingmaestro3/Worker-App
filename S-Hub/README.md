# AdwumaGo (S-Hub)

A React Native / Expo app connecting clients with verified blue-collar workers in Ghana, backed by Supabase (Postgres + Auth + Realtime + Edge Functions).

> **Note on this repo's layout:** if you cloned the parent `Worker-App` repository, this Expo project lives one level down, at `Worker-App/S-Hub`. Run every command below from inside `S-Hub/`, not the repo root.

## Get started

0. Use Node 20+ (see `.nvmrc` — `nvm use` if you have nvm installed).

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment variables — **required**, the app throws on startup without this

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and fill in the real values (see the comments in `.env.example`
   for what each one is for and where it comes from). `.env` is gitignored on
   purpose — it's never committed — so ask a teammate for the project's
   Supabase URL/anon key, or get them yourself from the
   [Supabase dashboard](https://supabase.com/dashboard) if you have project
   access, under Project Settings → API. All three team members should use the
   **same** Supabase project so everyone's writes/reads hit the same data.

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Project structure

This app uses plain [React Navigation](https://reactnavigation.org/), not Expo Router —
there is no `app/` directory. Start here:

- `App.tsx` — root `NavigationContainer` + `RootNavigator`.
- `navigation/` — route tables and tab navigators (`RootNavigator.tsx`, `CustomerTabs.tsx`, `WorkerTabs.tsx`, `types.ts`).
- `screens/` — every real screen, grouped by `auth/`, `common/`, `customer/`, `worker/`.
- `lib/` — Supabase client, auth, and one `api/*.ts` module per backend concern (bookings, service requests, bids, profiles, etc).
- `supabase/migrations/` — the live schema, RLS policies, and triggers. `supabase/functions/` — Edge Functions (AI photo analysis, push notifications, account deletion).

## Backend

This app talks to Supabase directly from the client — there's no separate API server to run. To change the schema, add a migration under `supabase/migrations/` and run:

```bash
npx supabase db push --linked
```

(requires `npx supabase login` and the project linked via `npx supabase link`).

## Learn more

- [Expo documentation](https://docs.expo.dev/versions/v54.0.0/): this project targets SDK 54 — check the versioned docs, not the latest docs, since APIs have changed across versions.
- [Supabase documentation](https://supabase.com/docs).
