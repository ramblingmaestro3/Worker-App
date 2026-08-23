import { supabase } from '../supabase';

export type ServiceRequestStatus = 'seeking_bids' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type ServiceRequest = {
  id: string;
  client_id: string;
  category: string;
  description: string | null;
  location_string: string | null;
  latitude: number | null;
  longitude: number | null;
  location_region: string | null;
  initial_offer_price: number | null;
  photos: string[];
  status: ServiceRequestStatus;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateServiceRequestInput = {
  category: string;
  description?: string;
  location_string?: string;
  latitude?: number;
  longitude?: number;
  location_region?: string;
  initial_offer_price?: number;
  photos?: string[];
  scheduled_for?: string;
};

/** Creates a new service request owned by the signed-in client. */
export async function createServiceRequest(
  input: CreateServiceRequestInput
): Promise<{ success: boolean; data?: ServiceRequest; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert({ client_id: auth.user.id, ...input })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ServiceRequest };
}

export async function getServiceRequest(
  id: string
): Promise<{ success: boolean; data?: ServiceRequest; error?: string }> {
  const { data, error } = await supabase.from('service_requests').select('*').eq('id', id).single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ServiceRequest };
}

/** Lists open requests any verified worker can browse and bid on. */
export async function listOpenServiceRequests(
  category?: string
): Promise<{ success: boolean; data?: ServiceRequest[]; error?: string }> {
  let query = supabase
    .from('service_requests')
    .select('*')
    .eq('status', 'seeking_bids')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as ServiceRequest[] };
}

/** Lists open requests matching any of a worker's skill categories — the job feed's core query. */
export async function listOpenServiceRequestsForCategories(
  categories: string[]
): Promise<{ success: boolean; data?: ServiceRequest[]; error?: string }> {
  if (categories.length === 0) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('status', 'seeking_bids')
    .in('category', categories)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as ServiceRequest[] };
}

/** Lists the signed-in client's own requests. */
export async function listMyServiceRequests(): Promise<{
  success: boolean;
  data?: ServiceRequest[];
  error?: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('client_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as ServiceRequest[] };
}

export async function updateServiceRequest(
  id: string,
  patch: Partial<CreateServiceRequestInput>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('service_requests').update(patch).eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** Cancels an open request — only works while still `seeking_bids` (enforced by RLS). */
export async function cancelServiceRequest(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
