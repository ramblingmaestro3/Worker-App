import { supabase } from '../supabase';
import { identityEmbed, withIdentityFallback } from './workerIdentity';

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

  const { data, error } = await supabase.from('bookings').update(patch).eq('id', bookingId).select('id');

  if (error) {
    return { success: false, error: error.message };
  }
  if (!data || data.length === 0) {
    return { success: false, error: 'This booking could not be updated — you may not be assigned to it anymore.' };
  }

  return { success: true };
}

/** Client cancels their own booking — only works while it isn't already completed or cancelled (enforced by RLS). */
export async function cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId);

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

  const { data, error } = await withIdentityFallback(() =>
    supabase
      .from('bookings')
      .select(
        `*, worker:profiles!bookings_worker_id_fkey(id,full_name,avatar_url${identityEmbed()}), request:service_requests!bookings_request_id_fkey(category,description,location_string), bid:worker_bids!bookings_bid_id_fkey(proposed_price,counter_price)`
      )
      .eq('client_id', auth.user.id)
      .order('created_at', { ascending: false })
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = (data ?? []).map((b: any) => ({ ...b, worker: resolveWorkerIdentity(b.worker) }));
  return { success: true, data: rows as unknown as ClientBookingView[] };
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

/** Counts the signed-in client's completed bookings — used for the client profile's "Completed" stat, filtered the same way (client_id + status='completed') as the bookings page's "Completed" tab. */
export async function countMyCompletedBookingsAsClient(): Promise<{ success: boolean; data?: number; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', auth.user.id)
    .eq('status', 'completed');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}

export type ConversationParticipant = { id: string; full_name: string; avatar_url: string | null };

/**
 * A booking's worker participant, shown to the client, uses the worker-facing
 * identity: `worker_profiles.display_name` / `photo_url` when set, else the
 * personal `profiles` values. Pass the embedded `profiles` row (with a nested
 * `worker_profiles(display_name,photo_url)`).
 */
function resolveWorkerIdentity(w: any): ConversationParticipant | null {
  if (!w) return null;
  const wp = Array.isArray(w.worker_profiles) ? w.worker_profiles[0] : w.worker_profiles;
  return {
    id: w.id,
    full_name: wp?.display_name || w.full_name || 'Worker',
    avatar_url: wp?.photo_url ?? w.avatar_url ?? null,
  };
}

export type ConversationView = {
  booking_id: string;
  booking_status: BookingStatus;
  request_id: string;
  client: ConversationParticipant;
  worker: ConversationParticipant;
  /** The participant who ISN'T the signed-in user — the one to show in the list.
   * Resolved by identity, not by which screen you're on, so it stays correct
   * for an account that acts as both a client and a worker. */
  other: ConversationParticipant;
  request_category: string | null;
  last_message: { id: string; message_text: string; sender_id: string; is_read: boolean; created_at: string } | null;
};

/** Lists the signed-in user's bookings (as either client or worker) enriched with both participants and the latest message, for the conversation-list screens. */
export async function listMyConversations(): Promise<{ success: boolean; data?: ConversationView[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }
  const uid = auth.user.id;

  const { data, error } = await withIdentityFallback(() =>
    supabase
      .from('bookings')
      .select(
        `id, status, request_id, client_id, worker_id,
         client:profiles!bookings_client_id_fkey(id,full_name,avatar_url),
         worker:profiles!bookings_worker_id_fkey(id,full_name,avatar_url${identityEmbed()}),
         request:service_requests!bookings_request_id_fkey(category),
         messages(id,message_text,sender_id,is_read,created_at)`
      )
      .or(`client_id.eq.${uid},worker_id.eq.${uid}`)
      .order('created_at', { referencedTable: 'messages', ascending: false })
      .limit(1, { referencedTable: 'messages' })
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const rows: ConversationView[] = (data ?? [])
    // A booking whose client and worker are the same person is degenerate
    // (a self-conversation) — never surface it as a chat.
    .filter((b: any) => b.client_id !== b.worker_id)
    .map((b: any) => {
      const worker = resolveWorkerIdentity(b.worker);
      return {
        booking_id: b.id,
        booking_status: b.status,
        request_id: b.request_id,
        client: b.client,
        worker: worker as ConversationParticipant,
        other: (b.client_id === uid ? worker : b.client) as ConversationParticipant,
        request_category: b.request?.category ?? null,
        last_message: b.messages?.[0] ?? null,
      };
    });

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
  request: {
    category: string;
    description: string | null;
    location_string: string | null;
    latitude: number | null;
    longitude: number | null;
    scheduled_for: string | null;
  } | null;
  bid: { proposed_price: number; counter_price: number | null } | null;
};

/** Fetches one booking with both participants' profiles and the linked request/bid, for the chat screen's header/banner and the job-detail screen. */
export async function getBookingWithContext(
  bookingId: string
): Promise<{ success: boolean; data?: BookingChatContext; error?: string }> {
  const { data, error } = await withIdentityFallback(() =>
    supabase
      .from('bookings')
      .select(
        `*, client:profiles!bookings_client_id_fkey(id,full_name,avatar_url),
         worker:profiles!bookings_worker_id_fkey(id,full_name,avatar_url${identityEmbed()}),
         request:service_requests!bookings_request_id_fkey(category,description,location_string,latitude,longitude,scheduled_for),
         bid:worker_bids!bookings_bid_id_fkey(proposed_price,counter_price)`
      )
      .eq('id', bookingId)
      .single()
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const ctx = data as any;
  ctx.worker = resolveWorkerIdentity(ctx.worker);
  return { success: true, data: ctx as BookingChatContext };
}

/**
 * The other party's phone number for a booking the caller is part of, for
 * tap-to-call. Returns `null` (not an error) when there's no number on file.
 */
export async function getBookingContactPhone(
  bookingId: string
): Promise<{ success: boolean; data?: string | null; error?: string }> {
  const { data, error } = await supabase.rpc('get_booking_contact_phone', { p_booking_id: bookingId });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data: (data as string | null) ?? null };
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
