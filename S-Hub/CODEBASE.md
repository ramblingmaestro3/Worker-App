# AdwumaGo — Codebase Guide

A mobile marketplace connecting Ghanaian households with verified blue-collar
workers (plumbers, electricians, carpenters…). Clients post a job, nearby
skill-matched workers bid, the client accepts one, and the two coordinate
through an in-app chat until the job is done and reviewed.

This document explains how the app is put together — read it before diving into
any single file.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Expo SDK 57** / React Native 0.86 / React 19.2 (New Architecture) |
| Navigation | **React Navigation 7** — native-stack + bottom-tabs |
| Backend | **Supabase** — Postgres + Row-Level Security, Auth, Realtime, Storage, Edge Functions |
| State | **Zustand** stores (`lib/stores/*`) + local component state; no Redux |
| Maps | `react-native-maps` (native) + Google Maps JS (`components/AppMap.web.tsx`) |
| AI | `supabase/functions/ai-analyze` (vision model) — identifies a problem from a photo |
| Push | `expo-notifications` + `supabase/functions/send-push` (Expo push) |

`AGENTS.md` pins the Expo docs version. Always read
`https://docs.expo.dev/versions/v57.0.0/` before touching native config.

---

## 2. What's live vs. dead code

- **LIVE:** everything under `screens/`, wired through `App.tsx` →
  `navigation/RootNavigator.tsx`. This is the whole app.
- **DEAD — do not edit:** the `app/` route-group directory (an earlier
  expo-router experiment). Nothing imports it. (`Workerapp-Backend/`, an
  abandoned Flask API, was deleted 2026-09-10.)

---

## 3. Folder map

```
App.tsx                 Root component: providers, auth init, deep links,
                        push routing, the app-wide unread poller.
index.js                registerRootComponent(App)

navigation/
  RootNavigator.tsx     The one native-stack. Lists every screen. Applies the
                        wallpaper layer (screenLayout) to each screen.
  CustomerTabs.tsx      Bottom tabs for a client: home / bookings / messages / profile
  WorkerTabs.tsx        Bottom tabs for a worker: dashboard / jobs / messages / settings
  *Screens.tsx          Arrays of {name, component} fed into RootNavigator,
                        split by area (auth / common / customer / worker).
  types.ts              RootStackParamList + the two TabParamLists — the
                        source of truth for every route name and its params.
  navigationRef.ts      navigate/reset helpers for non-component code
                        (lib/auth.ts routing, push-notification routing).

screens/
  auth/       Splash, Onboarding, SignIn, SignUp, OtpVerification,
              ResetPassword, BecomeWorker (4-step worker application),
              VerificationPending, Verified, WorkerGate.
  common/     Screens both sides use: JobDetail, AiAssistant, Settings,
              Support, Safety, Terms.
  customer/   PostAJob, FindingWorker, BidComparison, Chat, WorkerProfile,
              Search, LocationPicker, SavedLocations, Promotions,
              Notifications, ProfileEdit, and tabs/ (Home, Bookings,
              Messages, Profile).
  worker/     SubmitBid, JobPosting, WorkerSkills, WorkerPricing,
              WorkerAvailability, WorkerPersonalInfo, WorkerNotifications,
              and tabs/ (WorkerDashboard, WorkerJobs, WorkerMessages,
              WorkerProfileSettings).

lib/
  supabase.ts           The configured Supabase client.
  api/                   One module per domain. Every function returns
                         { success, data?, error? } — never throws.
    profiles, workerProfiles, serviceRequests, workerBids, bookings,
    messages, notifications, reviews, savedLocations, verification,
    storage, blocking, reports, pushTokens, realtime, ai, geocoding.
  stores/                Zustand: auth-store, nav-store, unread-store,
                         pinned-conversations-store.
  auth.ts                Sign-in/up helpers + routeSignedInUserByRole (the
                         one place that decides which "home" a user lands on).
  activeSide.ts          Remembers whether a dual-role account is currently
                         on the client or worker side.
  geo.ts                 distanceKm() haversine.
  useMyLocation.ts       Hook: device GPS + "City, Region" label.
  Alert.ts               Drop-in Alert.alert that also works on web.
  scaling.ts             Responsive size helpers (ws/wvs/wms, s/vs/ms).

components/
  AppBackground.tsx      The tiled tool wallpaper (SVG <Pattern>).
  WallpaperLayout.tsx    Wraps a screen in its own opaque wallpaper layer
                         (used via screenLayout on every navigator).
  ScreenHeader / ScreenContent   Shared page chrome + centred content column.
  ui/                    Card, EmptyState, Toast, SwipeableRow, NavPill,
                         CustomerTabBar, WorkerTabBar, HighlightedText…
  Require*.tsx            Route guards (signed-in / verified-worker).
  AppMap*.tsx            Map, with a .web.tsx variant.

contexts/ThemeContext.tsx   Light/dark palette + `useThemeColors()`.

supabase/
  migrations/            Ordered SQL. Schema + RLS + trigger functions.
  functions/             Edge functions: ai-analyze, send-push, delete-account.
  seed_dummy_workers.sql One-off: ~96 fake workers for browse testing.
  seed_dummy_reviews.sql One-off (run after ^): fake clients + completed
                         bookings + reviews backing each verified dummy
                         worker's rating_avg/rating_count. *_rollback.sql each.
```

---

## 4. Navigation & theming

- **One native-stack** (`RootNavigator`) holds every screen, plus the two
  bottom-tab navigators as single screens (`CustomerTabs`, `WorkerTabs`).
  Because it's flat, any screen can `navigate('Chat', …)` from anywhere.
- After sign-in, `lib/auth.ts`'s `routeSignedInUserByRole()` `reset()`s the
  stack onto the right tabs. `App.tsx` also bounces an already-signed-in user
  off the entry screens (Splash/SignIn/SignUp).
- **Wallpaper / backgrounds:** `T.bg` is `'transparent'`. Every screen paints
  that as its root background, and `screenLayout` (on the stack *and* both tab
  navigators) wraps each screen in `<WallpaperLayout>` — an opaque
  `T.bgSolid` layer + its own `<AppBackground>`. Net effect: the tool pattern
  shows through a screen's empty areas, but each screen is fully opaque so a
  pushed screen / inactive tab can't bleed through. **Any new navigator must
  add the same `screenLayout`.** `T.bgSolid` is the real colour for the rare
  element that must be opaque and match the page.

---

## 5. Data model (Postgres)

```
auth.users ──1:1── profiles (id, full_name, role 'client'|'worker'|'admin',
    │                         rating_avg, rating_count)
    │            └─1:1── profile_contact (phone, email)   ← OWNER-ONLY readable
    │
    └─(role=worker)── worker_profiles (skills text[], hourly_rate, per_job_rate,
    │                    latitude/longitude, availability jsonb, is_online,
    │                    display_name / photo_url ← worker-facing identity,
    │                      NULL falls back to profiles.full_name / avatar_url,
    │                    verification_status 'pending'|'verified'|'rejected')
    │              └─1:1── worker_verifications (id_type, id_number,
    │                        id_document_url, selfie_url, status)  ← OWNER-ONLY

service_requests (client_id, category, description, lat/lng, initial_offer_price,
    │             photos[], status 'seeking_bids'|'assigned'|'in_progress'
    │             |'completed'|'cancelled')
    │
    └─1:N── worker_bids (worker_id, proposed_price, counter_price, message,
              │           status 'pending'|'countered'|'accepted'|'declined'
              │           |'withdrawn')
              │
              └─(accepted, via accept_bid RPC)── bookings (client_id, worker_id,
                    │   bid_id, status 'accepted'|'en_route'|'arrived'
                    │   |'in_progress'|'completed'|'cancelled', *_at timestamps,
                    │   worker_lat/lng)
                    │
                    ├─1:N── messages (sender_id, message_text, is_read)
                    └─1:1── reviews (reviewer_id, reviewee_id, rating, comment)

notifications (user_id, type, title, body, data jsonb, is_read)  ← written ONLY
    by SECURITY DEFINER trigger functions, never by clients directly.

saved_locations, blocked_users, reports, push_tokens — supporting tables.
```

### Key model facts

- **`profiles.role` is per-account, but a verified worker can also act as a
  client.** `lib/activeSide.ts` tracks which side they're currently on. So any
  screen that shows "the other person" must resolve it by comparing
  `auth.uid()` to `client_id`/`worker_id` — never assume "I am the worker"
  from which tab the screen lives in. (`bookings.listMyConversations` returns a
  computed `other` participant for exactly this reason.)
- **`worker_profiles.skills` holds job-category slugs** (`'plumbing'`, …), the
  13 in **`constants/categories.ts` `SERVICE_CATEGORIES`** — the one shared list
  PostAJob, BecomeWorker, the CATEGORY_ICON lookups and the `ai-analyze`
  function (its own copy) all read from. A job matches a worker when
  `service_requests.category ∈ worker.skills`.
  ⚠️ The *WorkerSkills* edit screen and `seed_dummy_workers.sql` store
  **free text** instead — those workers won't match. (See §11.)
- **`bookings` is 1:1 with a `service_request`** (`request_id` is unique). A
  booking exists only after `accept_bid`.
- **Chat is booking-scoped.** No booking ⇒ no conversation; you can't message
  a worker before accepting their bid.

---

## 6. Security model (RLS) — the short version

Every table has RLS enabled. The recurring patterns:

- **Owner-only:** `profile_contact`, `worker_verifications`, `saved_locations`,
  `notifications` (select), `blocked_users` — `using (auth.uid() = id / user_id)`.
- **Participant-only:** `bookings`, `messages` — visible/writable only to the
  booking's `client_id` or `worker_id`.
- **Public-once-verified:** `worker_profiles` rows with
  `verification_status = 'verified'` are readable by any authenticated user
  (that's how browse/search works). Sensitive columns were moved OUT of
  `profiles` into `profile_contact` precisely because RLS is row- not
  column-level.
- **State-machine guards** live in `BEFORE UPDATE` trigger functions
  (SECURITY DEFINER), because RLS can't see OLD vs NEW together:
  `guard_booking_status_transition` (only the exact next step), `guard_*_status_change`
  (verification/role can only change via their RPC), self-bid prevention.
- **RPCs (`SECURITY DEFINER`)** do the privileged bits: `accept_bid` (the only
  way a booking is created), `finalize_verification`, `is_blocked_with`,
  `get_booking_contact_phone`, `start_conversation` *(planned)*.

---

## 7. Auth & onboarding

1. **Sign up** (`SignUp` → `lib/auth.ts signUpWithPassword`). Email
   confirmation is **off** project-wide (`config.toml enable_confirmations =
   false` — the Resend sandbox can only email one address), so signup returns a
   session immediately and the user is auto-verified. When it's on, the flow
   detours through `OtpVerification`.
2. `handle_new_user` trigger creates the `profiles` + `profile_contact` rows
   from the signup metadata (`full_name`, `role`).
3. **`routeSignedInUserByRole()`** decides the landing screen: remembered side
   → that home; else derive from worker-verification status. A "worker" choice
   is only trusted once `workerGateStatus === 'verified'`.
4. **Become a worker** (`BecomeWorker`, 4 steps: skills → personal info →
   availability/pricing → ID upload). On submit: `becomeWorker()` (role→worker)
   → `createWorkerProfile()` (+ device GPS) → `uploadIdDocument`/`uploadSelfie`
   to the private `id-documents` bucket → `submitVerification()` →
   `VerificationPending`.
5. **`VerificationPending`** runs a 5-second animation, then calls
   `finalize_verification()`. ⚠️ **There is no real ID/face verification** —
   the RPC only checks an ID doc is on file and ≥3 s elapsed, then flips to
   `verified`. Intentionally a stub (no admin panel). See §11.

---

## 8. The core flow (client ↔ worker)

```
CLIENT                                    WORKER
──────                                    ──────
PostAJob ──createServiceRequest──►
  status = 'seeking_bids'
FindingWorker
  • listVerifiedWorkersForCategory        WorkerDashboard / WorkerJobs
    (skill match, sorted by distance        • listOpenServiceRequestsForCategories
     from the job — lib/geo.distanceKm)       (jobs whose category ∈ my skills)
  • "no match" advice state after 6 s     JobPosting (read-only job view)
                                          SubmitBid ──► worker_bids row
                                            notify: (none to client yet — realtime)
BidComparison                             ◄── subscribeToRequestBids (realtime)
  • accept / counter / decline / withdraw
  • withdraw ──cancelServiceRequest──►
      trigger declines the open bids
  • accept ──accept_bid() RPC──►
      bookings row (status 'accepted'),
      other bids → 'declined',
      request → 'assigned'
                                          notify: "Your bid was accepted!"
JobDetail  ◄────────────────────────────► JobDetail (same screen, role-aware)
  • Chat (booking-scoped messages,          • "Mark En Route / Arrived / Start
     realtime, sender_id-based bubbles)        Job / Complete" — advanceBookingStatus
  • tap-to-call (get_booking_contact_phone    each step guarded by
     RPC — participant-gated)                 guard_booking_status_transition
  • live status banner + realtime refresh   notify client each step:
     ("Your worker is on the way")           "on the way" / "arrived" / …
  • after 'completed': leave a review ──► reviews row
      recalculate_reviewee_rating trigger rolls it into worker_profiles.rating_*
```

Every list/detail screen subscribes to the relevant table via
`lib/api/realtime.ts subscribeTo*` inside a `useFocusEffect` and unsubscribes
on blur (pushed-under screens stay mounted, so plain effect cleanup isn't
enough). `subscribeToTable` gives each subscription a **unique channel name** —
`supabase.channel(topic)` dedupes by topic and re-`.on()`ing a subscribed
channel throws.

---

## 9. AI assistant (`screens/common/AiAssistant.tsx`)

Photo → `analyzeProblem()` → `ai-analyze` edge function → `{ problem,
recommendations[] }`. `problem` is the vision model's assessment (title,
confidence, hazard flag); `recommendations` are ranked **category** guesses
(`{ category, label, confidence, reason }`). The screen then:
- shows the problem + category cards,
- fetches the **real nearby verified workers** for the top category
  (`listVerifiedWorkersForCategory`, sorted by distance from the user's GPS),
- "Post This Job" pre-fills `PostAJob` via `lib/aiJobDraftBridge`.

---

## 10. Notifications

- **In-app:** rows in `notifications`, written by trigger functions
  (`notify_bid_status_change`, `notify_new_message`,
  `notify_booking_status_change`). `Notifications` / `WorkerNotifications`
  screens render them; the `NotificationType` union + the `TYPE_META` maps in
  both screens **must mirror the DB `type` CHECK constraint** or an unknown
  type crashes the row render (there's a `DEFAULT_META` fallback now).
- **Push:** a `pg_net` webhook on `notifications` INSERT calls `send-push`,
  which looks up the user's Expo tokens (`push_tokens`) and sends. Needs an EAS
  project id (`EXPO_PUBLIC_EAS_PROJECT_ID`) — currently unset, so token
  registration no-ops with a console warning.
- **Tap routing:** `hooks/use-notification-routing.ts` (wired in `App.tsx`)
  sends a tapped push to the right screen (`new_message` → Chat, `booking_*` →
  JobDetail, `bid_*` → WorkerNotifications). No-ops on web.
- **Unread dots:** `lib/stores/unread-store.ts` (`messageCount`) drives the red
  dot on the Messages tab via `NavPill`'s `badge` prop; `use-unread-notifications.ts`
  drives the bell dot on the home/dashboard screens.

---

## 11. Known gaps / "planned future work"

These are deliberate stubs or incomplete pieces — good to be able to name them.

| Area | State |
|---|---|
| **Identity verification** | Self-attested stub. Upload any image → auto-"verified" in ~5 s. No OCR, no face-match, no admin review. Selfie is optional and never inspected. *Planned: manual review or a KYC provider (Smile ID).* |
| **Skills model** | `BecomeWorker` stores category slugs (correct). The *WorkerSkills* edit screen and the seed script store free text → those workers don't match jobs or discovery. *Planned: make WorkerSkills a category picker; re-seed.* |
| **Worker location** | Only seed workers and *new* Become-a-Worker accounts have GPS. Older accounts / edits via *Personal Info* have none → they show without a distance. |
| **Live tracking** | Status-based only ("on the way" banner + notification). No GPS map trail. `bookings.worker_lat/lng` columns exist, unused. |
| **Calling** | Tap-to-call opens the native dialer (`tel:`). No in-app VoIP. |
| **Pre-booking chat** | Not built. Messaging requires an accepted bid. A `conversations` table + `start_conversation` RPC were designed but not implemented. |
| **No ErrorBoundary** | Any render throw unmounts the whole tree → blank screen. `T.bg`/`T.bgSolid` background at least keeps it from being pure black. |
| **Silent update no-op** | `supabase.from(t).update({…}).eq(…)` with no `.select()` reports success on 0 rows. Hardened in `cancelServiceRequest`, `advanceBookingStatus`, `updateProfile`. Still present in `withdrawBid`, `declineBid`, `becomeWorker`, `markNotificationRead`. |
| **Placeholder buttons** | Support "Live Chat", Settings "Currency", Safety "Add Contact", and call/email on a *browsed* (non-booked) worker profile all say "coming soon". |
| **Unapplied migrations** | `20260909120000_prevent_self_bidding`, `20260909130000_withdraw_request_declines_bids`, `20260909140000_booking_contact_phone` — written but **not yet run against the live DB**. Until then: self-bidding isn't blocked and tap-to-call 404s. Run `supabase db push`. |

---

## 12. Running & building

```
npm install
npx expo start            # dev — scan the QR with Expo Go (SDK 57)
npx expo export --platform android --output-dir dist   # verify a production bundle
npx tsc --noEmit          # typecheck
npx expo lint             # lint
npx expo-doctor           # config sanity
```

Env (`.env`, all `EXPO_PUBLIC_*` are bundled): `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY`. Push needs `EXPO_PUBLIC_EAS_PROJECT_ID`.

Migrations reach the live DB via `supabase db push` (or the dashboard SQL
editor). Edge functions via `supabase functions deploy <name>`.
