// Pure helpers (no `@/` imports) so `node --test` can load them directly.
// Mirrors the checks in supabase/schema.sql (student_requests + the offer functions);
// the database stays the authority, these keep the UI honest.
import { normalizeTeachingLevels } from './tutor-visibility.ts';

export type TeachingMode = 'online' | 'in_person' | 'group' | 'hybrid';

export const TEACHING_MODES: readonly { value: TeachingMode; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In person' },
  { value: 'group', label: 'Group class' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const SCHEDULE_MAX = 200;
export const DETAILS_MAX = 1000;

export type RequestInput = {
  subjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  schedule: string;
  details: string;
};

type RequestField = keyof RequestInput;

export function validateRequestInput(
  input: RequestInput,
): { ok: true; value: RequestInput } | { ok: false; errors: Partial<Record<RequestField, string>> } {
  const errors: Partial<Record<RequestField, string>> = {};
  const schedule = input.schedule.trim();
  const details = input.details.trim();
  const modeValues = new Set<string>(TEACHING_MODES.map((mode) => mode.value));

  if (input.subjects.length === 0) errors.subjects = 'Choose at least one subject.';
  if (input.teachingLevels.length === 0) {
    errors.teachingLevels = 'Choose at least one level.';
  } else if (normalizeTeachingLevels(input.teachingLevels).length !== new Set(input.teachingLevels).size) {
    errors.teachingLevels = 'Unknown level.';
  }
  if (input.teachingModes.length === 0) {
    errors.teachingModes = 'Choose at least one way to learn.';
  } else if (input.teachingModes.some((mode) => !modeValues.has(mode))) {
    errors.teachingModes = 'Unknown learning mode.';
  }
  if (schedule.length === 0) errors.schedule = 'Tell tutors when you can study.';
  else if (schedule.length > SCHEDULE_MAX) errors.schedule = `Keep it under ${SCHEDULE_MAX} characters.`;
  if (details.length > DETAILS_MAX) errors.details = `Keep it under ${DETAILS_MAX} characters.`;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { ...input, schedule, details } };
}

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'deal_done' | 'closed' | 'withdrawn';
export type RequestStatus = 'open' | 'closed' | 'cancelled';
export type OfferAction = 'accept' | 'decline' | 'confirm_deal' | 'edit_price' | 'withdraw' | 'view_contact';

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  deal_done: 'Deal done',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
};

/** Which buttons an offer shows, matching what the DB functions will allow. */
export function offerActions(offer: OfferStatus, request: RequestStatus, viewer: 'student' | 'tutor'): OfferAction[] {
  if (offer === 'deal_done') return ['view_contact'];
  if (request !== 'open') return [];

  if (viewer === 'student') {
    if (offer === 'pending') return ['accept', 'decline'];
    if (offer === 'accepted') return ['view_contact', 'confirm_deal', 'decline'];
    return [];
  }

  if (offer === 'pending') return ['edit_price', 'withdraw'];
  if (offer === 'accepted') return ['view_contact', 'confirm_deal'];
  if (offer === 'withdrawn') return ['edit_price']; // resubmit
  return [];
}
