import { supabase } from '../supabase';

export type BookingStatus = 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  request_id: string;
  bid_id: string | null;
  client_id: string;
  worker_id: string;
  status: BookingStatus;
  accepted_at: string | null;
  en_route_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  worker_lat: number | null;
  worker_lng: number | null;
  location_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_TIMESTAMP_COLUMN: Partial<Record<BookingStatus, keyof Booking>> = {
  en_route: 'en_route_at',
  arrived: 'arrived_at',
  completed: 'completed_at',
  cancelled: 'cancelled_at',
};

export async function getBooking(id: string): Promise<{ success: boolean; data?: Booking; error?: string }> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Booking };
}

/** Lists bookings the signed-in user is a participant in, as either client or worker. */
export async function listMyBookings(): Promise<{ success: boolean; data?: Booking[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`client_id.eq.${auth.user.id},worker_id.eq.${auth.user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Booking[] };
}

/** Worker advances the booking's status, stamping the matching timestamp column. */
export async function advanceBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<{ success: boolean; error?: string }> {
  const patch: Record<string, unknown> = { status };
  const timestampColumn = STATUS_TIMESTAMP_COLUMN[status];
  if (timestampColumn) {
    patch[timestampColumn] = new Date().toISOString();
  }

  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export type WorkerBookingView = Booking & {
  client: { full_name: string } | null;
  request: { category: string; description: string | null; location_string: string | null; location_region: string | null } | null;
  bid: { proposed_price: number; counter_price: number | null } | null;
};

/** The signed-in worker's own bookings, enriched with the client's name and the request/bid details for display. */
export async function listMyBookingsAsWorker(): Promise<{
  success: boolean;
  data?: WorkerBookingView[];
  error?: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      '*, client:profiles!bookings_client_id_fkey(full_name), request:service_requests!bookings_request_id_fkey(category,description,location_string,location_region), bid:worker_bids!bookings_bid_id_fkey(proposed_price,counter_price)'
    )
    .eq('worker_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as unknown as WorkerBookingView[] };
}

export type ClientBookingView = Booking & {
  worker: { full_name: string } | null;
  request: { category: string; description: string | null; location_string: string | null } | null;
  bid: { proposed_price: number; counter_price: number | null } | null;
};

/** The signed-in client's own bookings, enriched with the worker's name and the request/bid details for display. */
export async function listMyBookingsAsClient(): Promise<{
  success: boolean;
  data?: ClientBookingView[];
  error?: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      '*, worker:profiles!bookings_worker_id_fkey(full_name), request:service_requests!bookings_request_id_fkey(category,description,location_string), bid:worker_bids!bookings_bid_id_fkey(proposed_price,counter_price)'
    )
    .eq('client_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as unknown as ClientBookingView[] };
}

/** Counts the signed-in worker's completed bookings — used for the "Jobs Done" stat. */
export async function countMyCompletedBookings(): Promise<{ success: boolean; data?: number; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('worker_id', auth.user.id)
    .eq('status', 'completed');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}

export type ConversationParticipant = { id: string; full_name: string; avatar_url: string | null };

export type ConversationView = {
  booking_id: string;
  booking_status: BookingStatus;
  request_id: string;
  client: ConversationParticipant;
  worker: ConversationParticipant;
  request_category: string | null;
  last_message: { id: string; message_text: string; sender_id: string; is_read: boolean; created_at: string } | null;
};

/** Lists the signed-in user's bookings (as either client or worker) enriched with both participants and the latest message, for the conversation-list screens. */
export async function listMyConversations(): Promise<{ success: boolean; data?: ConversationView[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, request_id, client_id, worker_id,
       client:profiles!bookings_client_id_fkey(id,full_name,avatar_url),
       worker:profiles!bookings_worker_id_fkey(id,full_name,avatar_url),
       request:service_requests!bookings_request_id_fkey(category),
       messages(id,message_text,sender_id,is_read,created_at)`
    )
    .or(`client_id.eq.${auth.user.id},worker_id.eq.${auth.user.id}`)
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' });

  if (error) {
    return { success: false, error: error.message };
  }

  const rows: ConversationView[] = (data ?? []).map((b: any) => ({
    booking_id: b.id,
    booking_status: b.status,
    request_id: b.request_id,
    client: b.client,
    worker: b.worker,
    request_category: b.request?.category ?? null,
    last_message: b.messages?.[0] ?? null,
  }));

  // PostgREST can't order a parent row by a nested one-to-many aggregate, so
  // sort by latest-activity client-side instead — cheap at this scale (a
  // user has at most dozens of bookings).
  rows.sort((a, b) => {
    const at = a.last_message?.created_at ?? '0';
    const bt = b.last_message?.created_at ?? '0';
    return bt.localeCompare(at);
  });

  return { success: true, data: rows };
}

export type BookingChatContext = Booking & {
  client: ConversationParticipant | null;
  worker: ConversationParticipant | null;
  request: { category: string; description: string | null } | null;
};

/** Fetches one booking with both participants' profiles and the linked request, for the chat screen's header/banner. */
export async function getBookingWithContext(
  bookingId: string
): Promise<{ success: boolean; data?: BookingChatContext; error?: string }> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `*, client:profiles!bookings_client_id_fkey(id,full_name,avatar_url),
       worker:profiles!bookings_worker_id_fkey(id,full_name,avatar_url),
       request:service_requests!bookings_request_id_fkey(category,description)`
    )
    .eq('id', bookingId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as unknown as BookingChatContext };
}

/** Worker streams their live position while en route — see Phase 5 for the watchPositionAsync wiring. */
export async function updateWorkerLocation(
  bookingId: string,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('bookings')
    .update({ worker_lat: latitude, worker_lng: longitude, location_updated_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
