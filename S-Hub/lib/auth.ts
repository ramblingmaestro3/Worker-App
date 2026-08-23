import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getMyProfile } from './api/profiles';

WebBrowser.maybeCompleteAuthSession();

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
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
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
}): Promise<{ success: boolean; error?: string }> {
  const isEmail = isEmailIdentifier(identifier);
  try {
    const options = { data: { full_name: fullName, role } };
    const { error } = isEmail
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

    return { success: true };
  } catch (err: any) {
    if (!isEmail) {
      return { success: false, error: 'Phone sign-up isn\'t available yet — please use email for now.' };
    }
    return { success: false, error: err?.message ?? 'Something went wrong creating your account.' };
  }
}

/** Sign in with an email OR phone number + password. */
export async function signInWithPassword({
  identifier,
  password,
}: {
  identifier: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = isEmailIdentifier(identifier)
      ? await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
      : await supabase.auth.signInWithPassword({ phone: formatGhanaPhone(identifier), password });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Something went wrong signing in.' };
  }
}

/**
 * Routes a just-authenticated user to the correct home screen for their
 * *actual* `profiles.role` — never the role toggle shown on the sign-in/
 * sign-up form, which is only a UI hint and has no bearing on an existing
 * account's real role. Every sign-in/sign-up entry point (password and
 * OAuth, on both screens) must call this so an existing worker account can
 * never land on the client home and vice versa, regardless of which path
 * or toggle state they came through.
 */
export async function routeSignedInUserByRole(): Promise<void> {
  const profile = await getMyProfile();
  if (profile.success && profile.data?.role === 'worker') {
    router.replace('/worker-dashboard' as any);
  } else {
    router.replace('/home' as any);
  }
}

/** Sign out the current user. */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Something went wrong signing out.' };
  }
}