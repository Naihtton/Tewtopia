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

export const DETAILS_MAX = 1000;

export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAYS: readonly { value: Day; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

/** 06:00, 06:30, … 22:00 — the choices for start/end times. */
export const TIME_OPTIONS: readonly string[] = Array.from({ length: (22 - 6) * 2 + 1 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

/** One time range on one weekday. Same shape as student_requests.schedule_slots in the DB. */
export type ScheduleSlot = { day: string; start: string; end: string };

export type RequestInput = {
  subjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  scheduleSlots: ScheduleSlot[];
  details: string;
};

const DAY_ORDER = new Map<string, number>(DAYS.map((day, index) => [day.value, index]));
const TIME_SET = new Set(TIME_OPTIONS);

function sortSlots(slots: ScheduleSlot[]) {
  return [...slots].sort((a, b) => (DAY_ORDER.get(a.day) ?? 99) - (DAY_ORDER.get(b.day) ?? 99));
}

function slotsError(slots: ScheduleSlot[]): string | null {
  if (slots.length === 0) return 'Pick at least one day and time.';
  const seen = new Set<string>();
  for (const slot of slots) {
    if (!DAY_ORDER.has(slot.day)) return 'Unknown day.';
    if (seen.has(slot.day)) return 'One time range per day.';
    seen.add(slot.day);
    if (!TIME_SET.has(slot.start) || !TIME_SET.has(slot.end)) return 'Times must be between 06:00 and 22:00, on the half hour.';
    if (slot.end <= slot.start) return 'End time must be after start time.';
  }
  return null;
}

/** "Mon 15:30–16:30 · Sat 09:00–11:00" */
export function formatSchedule(slots: ScheduleSlot[]): string {
  return sortSlots(slots)
    .map((slot) => `${DAYS.find((day) => day.value === slot.day)?.label ?? slot.day} ${slot.start}–${slot.end}`)
    .join(' · ');
}

type RequestField = keyof RequestInput;

export function validateRequestInput(
  input: RequestInput,
): { ok: true; value: RequestInput } | { ok: false; errors: Partial<Record<RequestField, string>> } {
  const errors: Partial<Record<RequestField, string>> = {};
  const details = input.details.trim();
  const modeValues = new Set<string>(TEACHING_MODES.map((mode) => mode.value));

  // One subject per request: tutors price per subject, and it keeps the board easy to scan.
  if (input.subjects.length !== 1) errors.subjects = 'Choose a subject.';
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
  const scheduleError = slotsError(input.scheduleSlots);
  if (scheduleError) errors.scheduleSlots = scheduleError;
  if (details.length > DETAILS_MAX) errors.details = `Keep it under ${DETAILS_MAX} characters.`;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { ...input, scheduleSlots: sortSlots(input.scheduleSlots), details } };
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
