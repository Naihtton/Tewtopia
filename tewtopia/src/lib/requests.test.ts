import assert from 'node:assert/strict';
import { test } from 'node:test';
import { OFFER_STATUS_LABEL, offerActions, TEACHING_MODES, validateRequestInput } from './requests.ts';

const valid = {
  subjects: ['Mathematics'],
  teachingLevels: ['primary'],
  teachingModes: ['online'],
  schedule: '  Sat-Sun afternoon ',
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
    value: { ...valid, schedule: 'Sat-Sun afternoon', details: 'Derivatives' },
  });
});

test('validateRequestInput reports each problem', () => {
  const result = validateRequestInput({ subjects: [], teachingLevels: [], teachingModes: [], schedule: '  ', details: '' });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.ok ? {} : result.errors).sort(), [
    'schedule',
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
  assert.deepEqual(errorsFor({ schedule: 'x'.repeat(201) }), ['schedule']);
  assert.deepEqual(errorsFor({ details: 'x'.repeat(1001) }), ['details']);
  assert.deepEqual(errorsFor({ teachingModes: ['weekend'] }), ['teachingModes']);
  assert.deepEqual(errorsFor({ teachingLevels: ['kindergarten'] }), ['teachingLevels']);
  assert.deepEqual(errorsFor({ schedule: 'x'.repeat(200), details: 'x'.repeat(1000) }), []);
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
