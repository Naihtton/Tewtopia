import type { OfferStatus, RequestStatus } from '@/lib/requests';
import { createClient } from '@/lib/supabase/server';
import { getPublicTutorCardsByIds, type BrowseTutorCard } from '@/lib/tutor-profiles';

export type RequestDetails = {
  id: string;
  status: RequestStatus;
  subjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  details: string;
  schedule: string;
  createdAt: string;
};

export type OfferForStudent = {
  id: string;
  status: OfferStatus;
  hourlyRate: number;
  tutorId: string;
  // null when the tutor is no longer listed on Find tutors
  tutor: BrowseTutorCard | null;
};

export type MyRequest = RequestDetails & { offers: OfferForStudent[] };

export type MyOffer = {
  id: string;
  status: OfferStatus;
  hourlyRate: number;
  request: RequestDetails | null;
};

type RequestRow = {
  id: string;
  status: RequestStatus;
  subjects: string[];
  teaching_levels: string[];
  teaching_modes: string[];
  details: string;
  schedule: string;
  created_at: string;
};

const REQUEST_COLUMNS = 'id, status, subjects, teaching_levels, teaching_modes, details, schedule, created_at';

function mapRequest(row: RequestRow): RequestDetails {
  return {
    id: row.id,
    status: row.status,
    subjects: row.subjects,
    teachingLevels: row.teaching_levels,
    teachingModes: row.teaching_modes,
    details: row.details,
    schedule: row.schedule,
    createdAt: row.created_at,
  };
}

// Offers that are still "live" come first; finished ones sink.
const OFFER_ORDER: Record<OfferStatus, number> = {
  accepted: 0,
  pending: 1,
  deal_done: 2,
  withdrawn: 3,
  declined: 4,
  closed: 5,
};

/** Student: own requests (RLS) with their offers and the offering tutors' public cards. */
export async function listMyRequestsWithOffers(userId: string): Promise<{ requests: MyRequest[]; error: string | null }> {
  const supabase = await createClient();
  const { data: requestRows, error } = await supabase
    .from('student_requests')
    .select(REQUEST_COLUMNS)
    .eq('student_user_id', userId)
    .order('created_at', { ascending: false })
    .returns<RequestRow[]>();

  if (error) {
    return { requests: [], error: error.message };
  }

  const ids = (requestRows ?? []).map((row) => row.id);
  const { data: offerRows } = ids.length
    ? await supabase.from('request_offers').select('id, request_id, tutor_user_id, status, hourly_rate').in('request_id', ids)
    : { data: [] as { id: string; request_id: string; tutor_user_id: string; status: OfferStatus; hourly_rate: number }[] };

  const tutors = await getPublicTutorCardsByIds([...new Set((offerRows ?? []).map((offer) => offer.tutor_user_id))]);

  return {
    requests: (requestRows ?? []).map((row) => ({
      ...mapRequest(row),
      offers: (offerRows ?? [])
        .filter((offer) => offer.request_id === row.id && offer.status !== 'withdrawn')
        .map((offer): OfferForStudent => ({
          id: offer.id,
          status: offer.status as OfferStatus,
          hourlyRate: offer.hourly_rate,
          tutorId: offer.tutor_user_id,
          tutor: tutors.get(offer.tutor_user_id) ?? null,
        }))
        .sort((a, b) => OFFER_ORDER[a.status] - OFFER_ORDER[b.status]),
    })),
    error: null,
  };
}

/** Tutor: own offers (RLS) with the requests they were made on. */
export async function listMyOffers(userId: string): Promise<{ offers: MyOffer[]; error: string | null }> {
  const supabase = await createClient();
  const { data: offerRows, error } = await supabase
    .from('request_offers')
    .select('id, request_id, status, hourly_rate, updated_at')
    .eq('tutor_user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return { offers: [], error: error.message };
  }

  const requestIds = [...new Set((offerRows ?? []).map((offer) => offer.request_id))];
  const { data: requestRows } = requestIds.length
    ? await supabase.from('student_requests').select(REQUEST_COLUMNS).in('id', requestIds).returns<RequestRow[]>()
    : { data: [] as RequestRow[] };
  const requests = new Map((requestRows ?? []).map((row) => [row.id, mapRequest(row)]));

  return {
    offers: (offerRows ?? [])
      .map((offer) => ({
        id: offer.id,
        status: offer.status as OfferStatus,
        hourlyRate: offer.hourly_rate,
        request: requests.get(offer.request_id) ?? null,
      }))
      .sort((a, b) => OFFER_ORDER[a.status] - OFFER_ORDER[b.status]),
    error: null,
  };
}
