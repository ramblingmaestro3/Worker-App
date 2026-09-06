import { supabase } from '../supabase';

/** Files a report against another user — visible only to the reporter (and, eventually, moderators); the reported user never sees it. */
export async function submitReport(input: {
  reportedId: string;
  reason: string;
  bookingId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: 'Not signed in.' };
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: auth.user.id,
    reported_id: input.reportedId,
    booking_id: input.bookingId ?? null,
    reason: input.reason.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
