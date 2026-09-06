import { supabase } from '../supabase';

export type SavedLocation = {
  id: string;
  user_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

/** Lists the signed-in user's saved places. */
export async function listSavedLocations(): Promise<{ success: boolean; data?: SavedLocation[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as SavedLocation[] };
}

/** Saves a new place for the signed-in user. */
export async function createSavedLocation(input: {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}): Promise<{ success: boolean; data?: SavedLocation; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('saved_locations')
    .insert({ user_id: auth.user.id, ...input })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as SavedLocation };
}

/** Removes one of the signed-in user's saved places. */
export async function deleteSavedLocation(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('saved_locations').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
