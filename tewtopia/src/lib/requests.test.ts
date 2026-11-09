import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DAYS,
  formatSchedule,
  OFFER_STATUS_LABEL,
  offerActions,
  TEACHING_MODES,
  TIME_OPTIONS,
  validateRequestInput,
} from './requests.ts';

const valid = {
  subjects: ['Mathematics'],
  teachingLevels: ['primary'],
  teachingModes: ['online'],
  scheduleSlots: [
    { day: 'sat', start: '09:00', end: '11:00' },
    { day: 'mon', start: '15:30', end: '16:30' },
  ],
  details: ' Derivatives ',
};

test('TEACHING_MODES values and labels', () => {
  assert.deepEqual(
    TEACHING_MODES.map((mode) => [mode.value, mode.label]),
    [
      ['online', 'Online'],
      ['in_person', 'In person'],
      ['group', 'Group class'],
      ['hybrid', 'Hybrid'],
    ],
  );
});

test('validateRequestInput trims a valid input', () => {
  assert.deepEqual(validateRequestInput(valid), {
    ok: true,
    // slots come back sorted Mon→Sun
    value: {
      ...valid,
      scheduleSlots: [
        { day: 'mon', start: '15:30', end: '16:30' },
        { day: 'sat', start: '09:00', end: '11:00' },
      ],
      details: 'Derivatives',
    },
  });
});

test('validateRequestInput reports each problem', () => {
  const result = validateRequestInput({ subjects: [], teachingLevels: [], teachingModes: [], scheduleSlots: [], details: '' });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.ok ? {} : result.errors).sort(), [
    'scheduleSlots',
    'subjects',
    'teachingLevels',
    'teachingModes',
  ]);
});

test('validateRequestInput length limits and unknown values', () => {
  const errorsFor = (patch: Partial<typeof valid>) => {
    const result = validateRequestInput({ ...valid, ...patch });
    return result.ok ? [] : Object.keys(result.errors);
  };
  assert.deepEqual(errorsFor({ details: 'x'.repeat(1001) }), ['details']);
  assert.deepEqual(errorsFor({ subjects: ['Mathematics', 'Physics'] }), ['subjects'], 'one subject per request');
  assert.deepEqual(errorsFor({ teachingModes: ['weekend'] }), ['teachingModes']);
  assert.deepEqual(errorsFor({ teachingLevels: ['kindergarten'] }), ['teachingLevels']);
  assert.deepEqual(errorsFor({ details: 'x'.repeat(1000) }), []);
});

test('offerActions for the student', () => {
  assert.deepEqual(offerActions('pending', 'open', 'student'), ['accept', 'decline']);
  assert.deepEqual(offerActions('accepted', 'open', 'student'), ['view_contact', 'confirm_deal', 'decline']);
  assert.deepEqual(offerActions('deal_done', 'closed', 'student'), ['view_contact']);
  assert.deepEqual(offerActions('pending', 'cancelled', 'student'), []);
});

test('offerActions for the tutor', () => {
  assert.deepEqual(offerActions('pending', 'open', 'tutor'), ['edit_price', 'withdraw']);
  assert.deepEqual(offerActions('accepted', 'open', 'tutor'), ['view_contact', 'confirm_deal']);
  assert.deepEqual(offerActions('deal_done', 'closed', 'tutor'), ['view_contact']);
  assert.deepEqual(offerActions('withdrawn', 'open', 'tutor'), ['edit_price']);
});

test('offerActions: finished offers allow nothing', () => {
  for (const status of ['closed', 'declined'] as const) {
    for (const viewer of ['student', 'tutor'] as const) {
      assert.deepEqual(offerActions(status, 'open', viewer), [], `${status}/${viewer}`);
    }
  }
  assert.deepEqual(offerActions('withdrawn', 'open', 'student'), []);
  assert.deepEqual(offerActions('withdrawn', 'closed', 'tutor'), []);
});

test('OFFER_STATUS_LABEL', () => {
  assert.deepEqual(OFFER_STATUS_LABEL, {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    deal_done: 'Deal done',
    closed: 'Closed',
    withdrawn: 'Withdrawn',
  });
});

test('DAYS and TIME_OPTIONS', () => {
  assert.deepEqual(DAYS.map((day) => day.value), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(TIME_OPTIONS[0], '06:00');
  assert.equal(TIME_OPTIONS[1], '06:30');
  assert.equal(TIME_OPTIONS.at(-1), '22:00');
});

test('schedule slots: bad day, off-grid time, end not after start, duplicate day', () => {
  const errorsFor = (scheduleSlots: { day: string; start: string; end: string }[]) => {
    const result = validateRequestInput({ ...valid, scheduleSlots });
    return result.ok ? [] : Object.keys(result.errors);
  };
  assert.deepEqual(errorsFor([{ day: 'fun', start: '09:00', end: '10:00' }]), ['scheduleSlots']);
  assert.deepEqual(errorsFor([{ day: 'mon', start: '09:15', end: '10:00' }]), ['scheduleSlots']);
  assert.deepEqual(errorsFor([{ day: 'mon', start: '05:30', end: '10:00' }]), ['scheduleSlots']);
  assert.deepEqual(errorsFor([{ day: 'mon', start: '10:00', end: '10:00' }]), ['scheduleSlots']);
  assert.deepEqual(errorsFor([{ day: 'mon', start: '11:00', end: '10:00' }]), ['scheduleSlots']);
  assert.deepEqual(
    errorsFor([
      { day: 'mon', start: '09:00', end: '10:00' },
      { day: 'mon', start: '15:00', end: '16:00' },
    ]),
    ['scheduleSlots'],
  );
  assert.deepEqual(errorsFor([{ day: 'sun', start: '21:30', end: '22:00' }]), []);
});

test('formatSchedule', () => {
  assert.equal(
    formatSchedule([
      { day: 'sat', start: '09:00', end: '11:00' },
      { day: 'mon', start: '15:30', end: '16:30' },
    ]),
    'Mon 15:30–16:30 · Sat 09:00–11:00',
  );
  assert.equal(formatSchedule([]), '');
});
