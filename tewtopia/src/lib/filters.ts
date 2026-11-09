// Pure helpers (no `@/` imports) so `node --test` can load them directly.
// Filters for /tutors and /requests, read from the URL so filtered views can be shared.
import { DAYS, TEACHING_MODES, type Day, type ScheduleSlot, type TeachingMode } from './requests.ts';
import { normalizeTeachingLevels, type TeachingLevel } from './tutor-visibility.ts';

// q = free-text search: tutor name / headline, or student name / request details.
export type TutorFilters = { q?: string; subject?: string; level?: TeachingLevel; mode?: TeachingMode; maxRate?: number };
export type RequestFilters = { q?: string; subject?: string; level?: TeachingLevel; mode?: TeachingMode; day?: Day };

const Q_MAX = 100;

type Params = Record<string, string | string[] | undefined>;

const MODE_VALUES = new Set<string>(TEACHING_MODES.map((mode) => mode.value));
const DAY_VALUES = new Set<string>(DAYS.map((day) => day.value));

// Tutors type their modes as free text ("Online", "In person"…); requests store values.
const MODE_ALIASES: Record<string, TeachingMode> = {
  online: 'online',
  remote: 'online',
  virtual: 'online',
  zoom: 'online',
  in_person: 'in_person',
  'in person': 'in_person',
  inperson: 'in_person',
  onsite: 'in_person',
  offline: 'in_person',
  'face to face': 'in_person',
  group: 'group',
  'group class': 'group',
  class: 'group',
  hybrid: 'hybrid',
  blended: 'hybrid',
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function parseLevel(value: string): TeachingLevel | undefined {
  return normalizeTeachingLevels([value])[0];
}

function parseMode(value: string): TeachingMode | undefined {
  return MODE_VALUES.has(value) ? (value as TeachingMode) : undefined;
}

function compact<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== '')) as T;
}

export function parseTutorFilters(params: Params): TutorFilters {
  const maxRate = Number(first(params.maxRate));
  return compact({
    q: first(params.q).slice(0, Q_MAX) || undefined,
    subject: first(params.subject) || undefined,
    level: parseLevel(first(params.level)),
    mode: parseMode(first(params.mode)),
    maxRate: Number.isInteger(maxRate) && maxRate > 0 ? maxRate : undefined,
  });
}

export function parseRequestFilters(params: Params): RequestFilters {
  const day = first(params.day);
  return compact({
    q: first(params.q).slice(0, Q_MAX) || undefined,
    subject: first(params.subject) || undefined,
    level: parseLevel(first(params.level)),
    mode: parseMode(first(params.mode)),
    day: DAY_VALUES.has(day) ? (day as Day) : undefined,
  });
}

export function hasActiveFilters(filters: TutorFilters | RequestFilters): boolean {
  return Object.keys(filters).length > 0;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const contains = (haystacks: string[], needle: string) => {
  const query = needle.toLowerCase();
  return haystacks.some((text) => text.toLowerCase().includes(query));
};

function modeOf(label: string): TeachingMode | undefined {
  return MODE_ALIASES[label.trim().toLowerCase()];
}

type FilterableTutor = {
  displayName: string;
  headline: string;
  preferredSubjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  rateMin: number | null;
};

export function filterTutors<T extends FilterableTutor>(tutors: T[], filters: TutorFilters): T[] {
  return tutors.filter(
    (tutor) =>
      (!filters.q || contains([tutor.displayName, tutor.headline], filters.q)) &&
      (!filters.subject || tutor.preferredSubjects.some((subject) => sameText(subject, filters.subject!))) &&
      (!filters.level || tutor.teachingLevels.includes(filters.level)) &&
      (!filters.mode || tutor.teachingModes.some((mode) => modeOf(mode) === filters.mode)) &&
      // Budget compares against the tutor's starting price.
      (!filters.maxRate || (tutor.rateMin !== null && tutor.rateMin <= filters.maxRate)),
  );
}

type FilterableRequest = {
  studentName: string;
  details: string;
  subjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  scheduleSlots: ScheduleSlot[];
};

export function filterRequests<T extends FilterableRequest>(requests: T[], filters: RequestFilters): T[] {
  return requests.filter(
    (request) =>
      (!filters.q || contains([request.studentName, request.details], filters.q)) &&
      (!filters.subject || request.subjects.some((subject) => sameText(subject, filters.subject!))) &&
      (!filters.level || request.teachingLevels.includes(filters.level)) &&
      (!filters.mode || request.teachingModes.includes(filters.mode)) &&
      (!filters.day || request.scheduleSlots.some((slot) => slot.day === filters.day)),
  );
}

/** Distinct subjects across the listed items (case-insensitive, first spelling wins), A→Z. */
export function subjectOptions(lists: string[][]): string[] {
  const byKey = new Map<string, string>();
  for (const subject of lists.flat()) {
    const key = subject.trim().toLowerCase();
    if (key && !byKey.has(key)) byKey.set(key, subject.trim());
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}
