import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resetToBecomeWorker, resetToCustomerHome, resetToVerificationPending, resetToWorkerHome } from '@/navigation/navigationRef';
import { getActiveSide, setActiveSide } from './activeSide';
import { clearMyPushTokens } from './api/pushTokens';
import { supabase } from './supabase';
import { useAuthStore } from './stores/auth-store';

WebBrowser.maybeCompleteAuthSession();

/**
 * Expo Go (storeClient) can't register the `shub://` scheme, so the OAuth
 * redirect comes back as `exp://<LAN-IP>` — which Google rejects and Supabase
 * can't whitelist reliably. Google/Apple sign-in only works in a real build.
 */
export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

/**
 * Build a redirect URL for the current platform pointing at the given
 * in-app path.
 *
 * - Native: uses the app scheme (e.g. "shub://") via expo-linking.
 *   In Expo Go this produces exp://IP:PORT/--/<path>
 * - Web: falls back to the current window origin + "/<path>".
 *
 * Must be added to the Supabase project's redirect URL allow-list
 * (auth.additional_redirect_urls) or Supabase will silently fall back to
 * the project's default Site URL instead of honoring this.
 */
export function buildRedirectUrl(path: string): string {
  return Platform.OS === 'web'
    ? `${window.location.origin}/${path}`
    : Linking.createURL(path);
}

/** OAuth redirect URL — see buildRedirectUrl. */
export const redirectTo = buildRedirectUrl('auth/callback');

/** True if the given sign-up/sign-in identifier looks like an email address rather than a phone number. */
export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

/** Normalizes a Ghanaian phone number (however typed) into E.164 format, e.g. "050 000 0000" -> "+233500000000". */
export function formatGhanaPhone(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, '').replace(/^0/, '');
  return digitsOnly.startsWith('233') ? `+${digitsOnly}` : `+233${digitsOnly}`;
}

/** Basic email format check (not exhaustive RFC 5322) — good enough to catch typos before a network round-trip. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** True if, once normalized the same way formatGhanaPhone does, this is a plausible 9-digit Ghanaian mobile number (leading 0 or 233 stripped, then a 2-9 first digit and 8 more digits). */
export function isValidGhanaPhone(raw: string): boolean {
  const digitsOnly = raw.replace(/\D/g, '');
  const local = digitsOnly.startsWith('233') ? digitsOnly.slice(3) : digitsOnly.replace(/^0/, '');
  return /^[2-9]\d{8}$/.test(local);
}

/**
 * Matches this project's configured Supabase Auth password policy
 * (supabase/config.toml: minimum_password_length = 8, password_requirements
 * = "lower_upper_letters_digits_symbols") so a weak password is rejected
 * inline instead of round-tripping to the server for the same rejection.
 * Returns the first unmet requirement, or null once the password satisfies all of them.
 */
export function passwordStrengthError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must include a symbol (e.g. !@#$%).';
  return null;
}

/**
 * Sign in with an OAuth provider (Google or Apple).
 *
 * Flow:
 *  1. Ask Supabase for the provider OAuth URL (without auto-redirecting).
 *  2. Open the system browser / in-app browser session.
 *  3. After the user authenticates, the browser redirects back to the app
 *     with `access_token`, `refresh_token`, etc. in the URL fragment/query.
 *  4. Parse those tokens and set the Supabase session.
 *
 * @param provider 'google' | 'apple'
 * @returns `{ success: boolean; error?: string }`
 */
export async function signInWithOAuthProvider(
  provider: 'google' | 'apple'
): Promise<{ success: boolean; error?: string }> {
  if (IS_EXPO_GO && Platform.OS !== 'web') {
    const label = provider === 'google' ? 'Google' : 'Apple';
    return {
      success: false,
      error: `${label} sign-in needs the installed AdwumaGo app — it can't complete inside Expo Go. Sign in with your email and password here.`,
    };
  }
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,


        queryParams: provider === 'google'
          ? {
              prompt: 'select_account',
            }
          : undefined,
      },
    });

    if (error) {
      // Neither provider has real credentials configured yet (project-level
      // toggle off, no client ID/secret) — GoTrue fails before any browser
      // ever opens, with an internal-sounding "provider is not enabled"
      // message. Give a message that actually explains what's wrong instead,
      // matching the phone sign-up and AI-assistant unavailable patterns.
      if (error.message.includes('not enabled') || error.message.includes('Unsupported provider')) {
        const label = provider === 'google' ? 'Google' : 'Apple';
        return { success: false, error: `Sign in with ${label} isn't available yet — please use email for now.` };
      }
      return { success: false, error: error.message };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (res.type !== 'success' || !res.url) {
      return { success: false, error: 'Authentication was cancelled.' };
    }

    // The redirect URL contains the tokens in the URL fragment (#) or query (?).
    const url = new URL(res.url);
    const params = new URLSearchParams(
      url.hash.startsWith('#') ? url.hash.substring(1) : url.search
    );

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      return { success: false, error: 'Failed to retrieve authentication tokens.' };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      return { success: false, error: sessionError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Something went wrong during authentication.' };
  }
}

/**
 * Create an account with an email OR phone number + password, tagging the
 * new user's metadata with `full_name` and `role` so the `handle_new_user`
 * DB trigger creates the matching `profiles` row with the right role.
 *
 * Email confirmations are on project-wide, so a fresh email signup returns
 * no session — `needsVerification: true` tells the caller to route to
 * OtpVerification instead of straight into the app.
 */
export async function signUpWithPassword({
  fullName,
  identifier,
  password,
  role,
}: {
  fullName: string;
  identifier: string;
  password: string;
  role: 'client' | 'worker';
}): Promise<{ success: boolean; needsVerification?: boolean; error?: string }> {
  const isEmail = isEmailIdentifier(identifier);
  try {
    const options = { data: { full_name: fullName, role } };
    const { data, error } = isEmail
      ? await supabase.auth.signUp({ email: identifier.trim(), password, options })
      : await supabase.auth.signUp({ phone: formatGhanaPhone(identifier), password, options });

    if (error) {
      // Phone sign-up requires a configured SMS provider (e.g. Twilio) that
      // this project doesn't have yet; GoTrue fails before it even gets to
      // validating input, with an opaque "{}"-style message. Give a message
      // that actually explains what's wrong instead.
      if (!isEmail) {
        return { success: false, error: 'Phone sign-up isn\'t available yet — please use email for now.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, needsVerification: !data.session };
  } catch (err: any) {
    if (!isEmail) {
      return { success: false, error: 'Phone sign-up isn\'t available yet — please use email for now.' };
    }
    return { success: false, error: err?.message ?? 'Something went wrong creating your account.' };
  }
}

/**
 * Sign in with an email OR phone number + password.
 *
 * `needsVerification: true` means the credentials were correct but the
 * account's email is still unconfirmed — route to OtpVerification instead
 * of just showing the raw "Email not confirmed" error.
 */
export async function signInWithPassword({
  identifier,
  password,
}: {
  identifier: string;
  password: string;
}): Promise<{ success: boolean; needsVerification?: boolean; error?: string }> {
  try {
    const { error } = isEmailIdentifier(identifier)
      ? await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
      : await supabase.auth.signInWithPassword({ phone: formatGhanaPhone(identifier), password });

    if (error) {
      if ((error as any).code === 'email_not_confirmed') {
        return { success: false, needsVerification: true, error: error.message };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Something went wrong signing in.' };
  }
}

// Supabase's onAuthStateChange listener (auth-store.ts) flips `status` to
// 'signed-in' as its own independent async event, separate from the
// signInWithPassword()/signUp() promise the sign-in/sign-up screens await
// before making their own explicit routeSignedInUserByRole(role) call.
// App.tsx's entry-screen watcher reacts to that same `status` flip and,
// seeing the route is still 'SignIn'/'SignUp' (the explicit call hasn't
// reset navigation yet), fires its own NO-preference call — racing the
// explicit one. Without serializing them, both can run concurrently and
// read activeSide/workerGateStatus before the other's write lands, so
// whichever's resetTo*Home() happens to execute last wins — silently
// overriding an explicit "sign in as client" with a verified worker
// account's remembered/eligible worker side. Chaining every call onto this
// queue forces them to run one at a time; since an explicit preferredMode
// call is unconditional, it always produces the correct final state
// whether it runs first (the trailing no-preference call just re-confirms
// the side it already persisted) or second (it overrides directly).
let routingQueue: Promise<void> = Promise.resolve();

/**
 * Routes a just-authenticated user to the requested side of the app.
 *
 * `preferredMode` is the sign-in screen's client/worker toggle. Choosing
 * "client" is trusted directly — client screens have no role gate at all,
 * see the "Switch to Client Mode" button, which does the same unconditional
 * reset. Choosing "worker" (or falling through to it below) is NOT trusted
 * directly, unlike this function used to: `profiles.role` flips to
 * 'worker' the moment a become-worker application is *submitted*
 * (lib/api/profiles.ts's becomeWorker(), called from BecomeWorker.tsx
 * before any admin review), well before `worker_profiles.verification_status`
 * ever reaches 'verified'. Only `workerGateStatus === 'verified'` means the
 * account is actually eligible to land on — and have this remember — the
 * worker side; anything else (not-worker, no-submission, pending, rejected)
 * routes into the matching step of the become-worker flow instead, the same
 * mapping RequireVerifiedWorker itself uses, without ever marking 'worker'
 * as the remembered side. Getting this wrong previously meant an applicant
 * who'd only *submitted* (never been approved) would get silently stranded
 * on the worker side on their very next relaunch.
 *
 * Whenever a side is actually landed on, it's persisted as the device's
 * remembered side (see lib/activeSide.ts) so it sticks across relaunches
 * and sign-out/sign-in until the user explicitly switches it.
 *
 * With no preferred mode given — a cold-start relaunch (Splash) or an
 * already-signed-in user bouncing off an entry screen (App.tsx) — this
 * honors whichever side was last explicitly (and successfully) landed on.
 * Only when the device has no remembered side yet (first sign-in ever) does
 * this fall back to deriving a starting side from the account's real
 * worker-verification status, via the same eligibility check above.
 */
export function routeSignedInUserByRole(preferredMode?: 'client' | 'worker'): Promise<void> {
  routingQueue = routingQueue.then(
    () => routeSignedInUserByRoleImpl(preferredMode),
    () => routeSignedInUserByRoleImpl(preferredMode)
  );
  return routingQueue;
}

async function routeSignedInUserByRoleImpl(preferredMode?: 'client' | 'worker'): Promise<void> {
  if (preferredMode === 'client') {
    await setActiveSide('client');
    resetToCustomerHome();
    return;
  }

  if (!preferredMode) {
    const rememberedSide = await getActiveSide();
    if (rememberedSide === 'worker') {
      resetToWorkerHome();
      return;
    }
    if (rememberedSide === 'client') {
      resetToCustomerHome();
      return;
    }
  }

  // Either an explicit "worker" preference, or no remembered side yet on
  // this device — in both cases only actually land on (and remember) the
  // worker side once the account is a verified worker. Explicitly refreshed
  // (rather than trusting the store's own onAuthStateChange listener to
  // have already resolved) since this can run immediately after
  // sign-in/sign-up, before that listener is guaranteed to have finished.
  await useAuthStore.getState().refreshProfile();
  const status = useAuthStore.getState().workerGateStatus;

  if (status === 'verified') {
    await setActiveSide('worker');
    resetToWorkerHome();
    return;
  }

  if (preferredMode === 'worker') {
    if (status === 'pending' || status === 'rejected') {
      resetToVerificationPending();
    } else {
      resetToBecomeWorker();
    }
    return;
  }

  await setActiveSide('client');
  resetToCustomerHome();
}

/**
 * Set right before signOut() actually calls supabase.auth.signOut(), and
 * consumed (read then cleared) by App.tsx's global session-expiry watcher.
 * Supabase's onAuthStateChange fires the identical 'SIGNED_OUT' event for
 * both an intentional sign-out and a refresh token that's silently died
 * (expired, revoked, device clock skew) — there's no way to tell those two
 * apart from the event itself, so this flag is the signal: if it's set when
 * a signed-in -> signed-out transition happens, the user did this on
 * purpose (their own screen already handles the redirect); if it's unset,
 * the session died out from under them and they need to be told why.
 */
export const signOutIntent = { current: false };

/** Sign out the current user. */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    signOutIntent.current = true;

    // Before the session goes away — clearMyPushTokens needs auth.uid() to
    // know whose tokens to remove, and its RLS policy requires it. Best
    // effort: a failure here shouldn't block sign-out itself.
    await clearMyPushTokens();

    const { error } = await supabase.auth.signOut();

    if (error) {
      signOutIntent.current = false;
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    signOutIntent.current = false;
    return { success: false, error: err?.message ?? 'Something went wrong signing out.' };
  }
}
