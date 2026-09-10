import { supabase } from '../supabase';
import { Booking } from './bookings';

export type WorkerBidStatus = 'pending' | 'accepted' | 'countered' | 'declined' | 'withdrawn';

export type WorkerBid = {
  id: string;
  request_id: string;
  worker_id: string;
  proposed_price: number;
  message: string | null;
  counter_price: number | null;
  counter_message: string | null;
  status: WorkerBidStatus;
  created_at: string;
  updated_at: string;
};

export type BidWithWorker = WorkerBid & {
  worker: { full_name: string; rating_avg: number; rating_count: number } | null;
};

/** Submits a bid on an open request. RLS requires the caller to be a verified worker. */
export async function createBid({
  requestId,
  proposedPrice,
  message,
}: {
  requestId: string;
  proposedPrice: number;
  message?: string;
}): Promise<{ success: boolean; data?: WorkerBid; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('worker_bids')
    .insert({ request_id: requestId, worker_id: auth.user.id, proposed_price: proposedPrice, message })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as WorkerBid };
}

/** Lists bids on a request with the bidding worker's public profile embedded — for the client's bid-comparison view. */
export async function listBidsForRequest(
  requestId: string
): Promise<{ success: boolean; data?: BidWithWorker[]; error?: string }> {
  const { data, error } = await supabase
    .from('worker_bids')
    .select(
      '*, worker:profiles!worker_bids_worker_id_fkey(full_name,rating_avg,rating_count,worker_profiles(display_name))'
    )
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  // Show the worker-facing name (worker_profiles.display_name override).
  const rows = (data ?? []).map((b: any) => {
    const wp = Array.isArray(b.worker?.worker_profiles) ? b.worker.worker_profiles[0] : b.worker?.worker_profiles;
    return b.worker
      ? { ...b, worker: { ...b.worker, full_name: wp?.display_name || b.worker.full_name } }
      : b;
  });
  return { success: true, data: rows as unknown as BidWithWorker[] };
}

/** Lists the signed-in worker's own bids. */
export async function listMyBids(): Promise<{ success: boolean; data?: WorkerBid[]; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('worker_bids')
    .select('*')
    .eq('worker_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as WorkerBid[] };
}

/**
 * Worker responds to a client's counter-offer by matching it — sets their own
 * bid back to 'pending' at the client's counter_price, so the client can
 * accept it directly. (A worker can't call accept_bid themselves — only the
 * request owner can — this just signals "I agree", the client finalizes it.)
 */
export async function matchCounterOffer(
  bidId: string,
  counterPrice: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('worker_bids')
    .update({ status: 'pending', proposed_price: counterPrice })
    .eq('id', bidId)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "Couldn't accept this counter-offer — the client may have withdrawn it." };
  }

  return { success: true };
}

/** Worker withdraws their own pending bid. `.select()` so a row blocked by RLS
 * (not the owner, or already accepted/declined) comes back empty instead of a
 * silent success. */
export async function withdrawBid(bidId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('worker_bids')
    .update({ status: 'withdrawn' })
    .eq('id', bidId)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "This bid can't be withdrawn — it may already have been accepted or declined." };
  }

  return { success: true };
}

/** Client counter-proposes a different price on a worker's bid. */
export async function counterBid(
  bidId: string,
  { counterPrice, counterMessage }: { counterPrice: number; counterMessage?: string }
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('worker_bids')
    .update({ status: 'countered', counter_price: counterPrice, counter_message: counterMessage })
    .eq('id', bidId)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "This bid can't be countered — it may have been withdrawn or already actioned." };
  }

  return { success: true };
}

/** Client declines a bid without accepting or countering. */
export async function declineBid(bidId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('worker_bids')
    .update({ status: 'declined' })
    .eq('id', bidId)
    .select('id');

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: false, error: "This bid can't be declined — it may have been withdrawn already." };
  }

  return { success: true };
}

/**
 * Client accepts a bid via the `accept_bid` RPC, which atomically creates the
 * booking, marks this bid accepted, declines the request's other active bids,
 * and flips the request to 'assigned'. This is the only way a booking is created.
 */
export async function acceptBid(bidId: string): Promise<{ success: boolean; data?: Booking; error?: string }> {
  const { data, error } = await supabase.rpc('accept_bid', { p_bid_id: bidId });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Booking };
}
