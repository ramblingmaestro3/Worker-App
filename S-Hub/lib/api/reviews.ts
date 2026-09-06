import { supabase } from '../supabase';

export type Review = {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/** Leaves a review for the other participant on a completed booking — RLS enforces the booking is actually completed and the reviewer/reviewee are the two real participants. */
export async function submitReview(input: {
  bookingId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('reviews').insert({
    booking_id: input.bookingId,
    reviewer_id: auth.user.id,
    reviewee_id: input.revieweeId,
    rating: input.rating,
    comment: input.comment?.trim() || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You already reviewed this job.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** The signed-in user's own review for a booking, if they've already left one. */
export async function getMyReviewForBooking(
  bookingId: string
): Promise<{ success: boolean; data?: Review | null; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Review | null };
}

export type ReviewWithReviewer = Review & {
  reviewer: { full_name: string; avatar_url: string | null } | null;
};

/** Every review left FOR a given user — their public rating history (e.g. a worker's profile). */
export async function listReviewsForUser(
  userId: string
): Promise<{ success: boolean; data?: ReviewWithReviewer[]; error?: string }> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name,avatar_url)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as unknown as ReviewWithReviewer[] };
}
