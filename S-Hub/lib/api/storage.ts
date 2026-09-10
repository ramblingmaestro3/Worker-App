import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '../supabase';

/**
 * Reads the bytes of a locally-picked image so they can be handed to Supabase
 * Storage.
 *
 * The old path here was `await fetch(uri).blob()` → `.upload(path, blob)`. On
 * React Native that silently uploaded a **0-byte file**: supabase-js wraps a
 * Blob in `FormData`, and RN's FormData can't serialise a Blob part, so the
 * multipart body it built had no actual file in it. The upload "succeeded",
 * the row stored a URL, and the image showed up blank/missing.
 *
 * Native now reads the file straight off disk with expo-file-system and
 * uploads the raw bytes (supabase-js sends an `ArrayBuffer`/`Uint8Array` body
 * directly, no FormData). Web keeps `fetch().blob()` — browsers serialise a
 * Blob part correctly.
 */
async function readPickedImage(
  uri: string
): Promise<{ ok: true; body: Uint8Array | Blob; size: number } | { ok: false; error: string }> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      if (!response.ok) {
        return { ok: false, error: `Could not read the image (${response.status}).` };
      }
      const blob = await response.blob();
      return { ok: true, body: blob, size: blob.size };
    }

    const file = new File(uri);
    if (!file.exists) {
      return { ok: false, error: 'That image is no longer available on your device.' };
    }
    const bytes = await file.bytes();
    return { ok: true, body: bytes, size: bytes.byteLength };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Could not read the selected image.' };
  }
}

async function uploadUriToBucket(
  uri: string,
  bucket: string,
  path: string,
  contentType = 'image/jpeg'
): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
  const read = await readPickedImage(uri);
  if (!read.ok) {
    return { success: false, error: read.error };
  }
  if (read.size === 0) {
    return { success: false, error: 'That image file is empty — please pick it again.' };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, read.body, {
    contentType,
    upsert: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { success: true, path, publicUrl: data.publicUrl };
}

/**
 * Uploads a worker's ID document photo to the private `id-documents` bucket.
 * Returns the storage `path` (not a usable public URL, since the bucket is
 * private) — store this in worker_verifications.id_document_url.
 */
export async function uploadIdDocument(uri: string): Promise<{ success: boolean; path?: string; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }
  const path = `${auth.user.id}/id-document-${Date.now()}.jpg`;
  const result = await uploadUriToBucket(uri, 'id-documents', path);
  return { success: result.success, path: result.path, error: result.error };
}

/** Uploads a worker's verification selfie to the private `id-documents` bucket. */
export async function uploadSelfie(uri: string): Promise<{ success: boolean; path?: string; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }
  const path = `${auth.user.id}/selfie-${Date.now()}.jpg`;
  const result = await uploadUriToBucket(uri, 'id-documents', path);
  return { success: result.success, path: result.path, error: result.error };
}

/** Uploads a job photo to the public `job-photos` bucket, returning its public URL. */
export async function uploadJobPhoto(uri: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }
  const path = `${auth.user.id}/${Date.now()}.jpg`;
  const result = await uploadUriToBucket(uri, 'job-photos', path);
  return { success: result.success, publicUrl: result.publicUrl, error: result.error };
}

/**
 * Uploads a profile photo to the public `job-photos` bucket (the app's only
 * public bucket — reused rather than adding a new one) and returns its public
 * URL. Each upload gets a fresh timestamped path so the URL changes and any
 * cached copy is bypassed on next load. Store the URL in profiles.avatar_url.
 */
export async function uploadAvatar(uri: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }
  const path = `${auth.user.id}/avatar-${Date.now()}.jpg`;
  const result = await uploadUriToBucket(uri, 'job-photos', path);
  return { success: result.success, publicUrl: result.publicUrl, error: result.error };
}
