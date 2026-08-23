import { supabase } from '../supabase';

async function uploadUriToBucket(
  uri: string,
  bucket: string,
  path: string,
  contentType = 'image/jpeg'
): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType,
      upsert: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { success: true, path, publicUrl: data.publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to upload file.' };
  }
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
