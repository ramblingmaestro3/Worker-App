/**
 * `worker_profiles.display_name` / `photo_url` (migration
 * 20260910120000_worker_profile_display_identity) are the worker-facing identity
 * override — shown to clients instead of the personal `profiles` name/photo.
 *
 * Until that migration is applied, selecting those columns 42703s and takes the
 * whole query down with it (worker discovery, chat, bookings, bid comparison).
 * The reader queries below opt in via `identityCols()` / `identityEmbed()` and,
 * on the missing-column error, retry once without them and remember to skip
 * them for the rest of the session. Once the migration lands everything just
 * works — no code change needed.
 */
let available = true;

/** Select fragment for a flat `worker_profiles` query — trailing comma included. */
export function identityCols(): string {
  return available ? 'display_name, photo_url, ' : '';
}

/** Nested-embed fragment for a `profiles(...)` selection — leading comma included. */
export function identityEmbed(): string {
  return available ? ',worker_profiles(display_name,photo_url)' : '';
}

/** Drops `display_name` / `photo_url` from a write payload once we know the columns are missing. */
export function stripIdentityKeys<T extends Record<string, unknown>>(patch: T): T {
  if (available) return patch;
  const clone = { ...patch };
  delete clone.display_name;
  delete clone.photo_url;
  return clone;
}

/**
 * Runs `build()`; if it fails because the identity columns don't exist yet,
 * disables them and runs `build()` again (which now omits them).
 */
export async function withIdentityFallback<R extends { data: unknown; error: unknown }>(
  build: () => PromiseLike<R>
): Promise<R> {
  const first = await build();
  if (isMissingIdentityColumn(first.error)) {
    return build();
  }
  return first;
}

function isMissingIdentityColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const msg = e.message ?? '';
  if (
    e.code === '42703' ||
    /worker_profiles.*(display_name|photo_url)/i.test(msg) ||
    /(display_name|photo_url).*does not exist/i.test(msg)
  ) {
    available = false;
    return true;
  }
  return false;
}
