import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterRequests,
  filterTutors,
  hasActiveFilters,
  parseRequestFilters,
  parseTutorFilters,
  subjectOptions,
} from './filters.ts';

const tutors = [
  { id: 'a', displayName: 'Pim S.', headline: 'IB Math coach', preferredSubjects: ['Mathematics', 'Physics'], teachingLevels: ['primary'], teachingModes: ['Online'], rateMin: 300, rateMax: 500 },
  { id: 'b', displayName: 'ครูนก', headline: 'English for adults', preferredSubjects: ['english'], teachingLevels: ['university', 'adult'], teachingModes: ['In person', 'Group class'], rateMin: 600, rateMax: 600 },
  { id: 'c', displayName: 'Krit', headline: 'Physics made simple', preferredSubjects: ['Physics'], teachingLevels: ['upper_secondary'], teachingModes: ['hybrid'], rateMin: 250, rateMax: 400 },
];

const requests = [
  { id: 'r1', studentName: 'Nok', details: 'Derivatives for midterm', subjects: ['Mathematics'], teachingLevels: ['upper_secondary'], teachingModes: ['online'], scheduleSlots: [{ day: 'mon', start: '15:30', end: '16:30' }] },
  { id: 'r2', studentName: 'มายด์', details: '', subjects: ['English'], teachingLevels: ['primary'], teachingModes: ['in_person', 'group'], scheduleSlots: [{ day: 'sat', start: '09:00', end: '11:00' }, { day: 'sun', start: '09:00', end: '10:00' }] },
];

const ids = (items: { id: string }[]) => items.map((item) => item.id);

test('parseTutorFilters keeps only valid values', () => {
  assert.deepEqual(parseTutorFilters({ subject: ' Physics ', level: 'primary', mode: 'online', maxRate: '500' }), {
    subject: 'Physics',
    level: 'primary',
    mode: 'online',
    maxRate: 500,
  });
  assert.deepEqual(parseTutorFilters({ subject: '', level: 'kindergarten', mode: 'weekend', maxRate: 'abc' }), {});
  assert.deepEqual(parseTutorFilters({ maxRate: '-5' }), {});
  assert.deepEqual(parseTutorFilters({ maxRate: ['400', '500'] }), { maxRate: 400 }, 'first value of a repeated param');
});

test('parseRequestFilters keeps only valid values', () => {
  assert.deepEqual(parseRequestFilters({ subject: 'English', level: 'primary', mode: 'group', day: 'sat' }), {
    subject: 'English',
    level: 'primary',
    mode: 'group',
    day: 'sat',
  });
  assert.deepEqual(parseRequestFilters({ day: 'funday', mode: 'Online' }), {});
});

test('filterTutors: no filters returns everything', () => {
  assert.deepEqual(ids(filterTutors(tutors, {})), ['a', 'b', 'c']);
});

test('filterTutors: subject is case-insensitive', () => {
  assert.deepEqual(ids(filterTutors(tutors, { subject: 'physics' })), ['a', 'c']);
  assert.deepEqual(ids(filterTutors(tutors, { subject: 'English' })), ['b']);
});

test('filterTutors: level, mode (free-text tutor labels) and max rate', () => {
  assert.deepEqual(ids(filterTutors(tutors, { level: 'adult' })), ['b']);
  assert.deepEqual(ids(filterTutors(tutors, { mode: 'online' })), ['a']);
  assert.deepEqual(ids(filterTutors(tutors, { mode: 'group' })), ['b']);
  assert.deepEqual(ids(filterTutors(tutors, { mode: 'hybrid' })), ['c']);
  assert.deepEqual(ids(filterTutors(tutors, { maxRate: 300 })), ['a', 'c'], 'starting price within budget');
  assert.deepEqual(ids(filterTutors(tutors, { maxRate: 250 })), ['c']);
});

test('filterTutors: filters combine', () => {
  assert.deepEqual(ids(filterTutors(tutors, { subject: 'Physics', maxRate: 260 })), ['c']);
  assert.deepEqual(ids(filterTutors(tutors, { subject: 'Physics', level: 'adult' })), []);
});

test('filterRequests by subject, level, mode and day', () => {
  assert.deepEqual(ids(filterRequests(requests, {})), ['r1', 'r2']);
  assert.deepEqual(ids(filterRequests(requests, { subject: 'english' })), ['r2']);
  assert.deepEqual(ids(filterRequests(requests, { level: 'upper_secondary' })), ['r1']);
  assert.deepEqual(ids(filterRequests(requests, { mode: 'group' })), ['r2']);
  assert.deepEqual(ids(filterRequests(requests, { day: 'sun' })), ['r2']);
  assert.deepEqual(ids(filterRequests(requests, { day: 'tue' })), []);
});

test('subjectOptions: distinct, case-insensitive, sorted, first spelling wins', () => {
  assert.deepEqual(subjectOptions(tutors.map((tutor) => tutor.preferredSubjects)), ['english', 'Mathematics', 'Physics']);
});

test('hasActiveFilters', () => {
  assert.equal(hasActiveFilters({}), false);
  assert.equal(hasActiveFilters({ subject: 'Physics' }), true);
});

test('parse: q is trimmed, empty dropped, capped at 100 chars', () => {
  assert.deepEqual(parseTutorFilters({ q: '  pim  ' }), { q: 'pim' });
  assert.deepEqual(parseRequestFilters({ q: '   ' }), {});
  assert.equal(parseTutorFilters({ q: 'x'.repeat(150) }).q?.length, 100);
});

test('filterTutors: q matches name or headline, case-insensitive, Thai too', () => {
  assert.deepEqual(ids(filterTutors(tutors, { q: 'pim' })), ['a']);
  assert.deepEqual(ids(filterTutors(tutors, { q: 'PHYSICS' })), ['c'], 'headline match');
  assert.deepEqual(ids(filterTutors(tutors, { q: 'ครู' })), ['b']);
  assert.deepEqual(ids(filterTutors(tutors, { q: 'zzz' })), []);
  assert.deepEqual(ids(filterTutors(tutors, { q: 'i', subject: 'Physics' })), ['a', 'c'], 'combines with other filters');
});

test('filterRequests: q matches student name or details', () => {
  assert.deepEqual(ids(filterRequests(requests, { q: 'nok' })), ['r1']);
  assert.deepEqual(ids(filterRequests(requests, { q: 'midterm' })), ['r1']);
  assert.deepEqual(ids(filterRequests(requests, { q: 'มาย' })), ['r2']);
});
