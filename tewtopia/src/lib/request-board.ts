import type { OfferStatus } from '@/lib/requests';
import { createClient } from '@/lib/supabase/server';

export type RequestCard = {
  id: string;
  subjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  details: string;
  schedule: string;
  createdAt: string;
  offerCount: number;
};

type RequestCardRow = {
  id: string;
  subjects: string[] | null;
  teaching_levels: string[] | null;
  teaching_modes: string[] | null;
  details: string | null;
  schedule: string | null;
  created_at: string;
  offer_count: number | null;
};

// Public board: reads only public_request_cards (no student identity, no prices).
export async function listOpenRequests(): Promise<{ requests: RequestCard[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('public_request_cards')
    .select('id, subjects, teaching_levels, teaching_modes, details, schedule, created_at, offer_count')
    .order('created_at', { ascending: false })
    .returns<RequestCardRow[]>();

  if (error) {
    console.error('listOpenRequests failed:', error.message);
    return { requests: [], error: "We couldn't load requests right now. Please try again shortly." };
  }

  return {
    requests: (data ?? []).map((row) => ({
      id: row.id,
      subjects: row.subjects ?? [],
      teachingLevels: row.teaching_levels ?? [],
      teachingModes: row.teaching_modes ?? [],
      details: row.details ?? '',
      schedule: row.schedule ?? '',
      createdAt: row.created_at,
      offerCount: row.offer_count ?? 0,
    })),
    error: null,
  };
}

export type MyOfferOnRequest = { id: string; status: OfferStatus; hourlyRate: number };

/** For a signed-in tutor: listed?, and their own offers keyed by request id. */
export async function getTutorBoardState(userId: string): Promise<{
  isListed: boolean;
  offersByRequest: Record<string, MyOfferOnRequest>;
}> {
  const supabase = await createClient();
  const [{ data: card }, { data: offers }] = await Promise.all([
    supabase.from('public_tutor_cards').select('id').eq('id', userId).maybeSingle(),
    supabase.from('request_offers').select('id, request_id, status, hourly_rate').eq('tutor_user_id', userId),
  ]);

  const offersByRequest: Record<string, MyOfferOnRequest> = {};
  for (const offer of offers ?? []) {
    offersByRequest[offer.request_id] = { id: offer.id, status: offer.status, hourlyRate: offer.hourly_rate };
  }

  return { isListed: Boolean(card), offersByRequest };
}
