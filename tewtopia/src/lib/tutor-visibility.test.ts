import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingTutorFields, normalizeTeachingLevels, TEACHING_LEVELS, tutorListingStatus, tutorSetupChecklist } from './tutor-visibility.ts';

const complete = { displayName: 'Pim', rateMin: 300, rateMax: 500, subjects: ['Math'], teachingLevels: ['primary'], hasContact: true };

test('complete tutor has nothing missing', () => {
  assert.deepEqual(missingTutorFields(complete), []);
});

test('reports each missing field in order', () => {
  assert.deepEqual(
    missingTutorFields({ displayName: '  ', rateMin: null, rateMax: null, subjects: [], teachingLevels: [], hasContact: false }),
    ['display name', 'hourly rate', 'subjects', 'teaching levels', 'contact details'],
  );
});

test('rate below 250, reversed or missing counts as missing', () => {
  assert.deepEqual(missingTutorFields({ ...complete, rateMin: 200 }), ['hourly rate']);
  assert.deepEqual(missingTutorFields({ ...complete, rateMin: 500, rateMax: 300 }), ['hourly rate']);
  assert.deepEqual(missingTutorFields({ ...complete, rateMin: null, rateMax: null }), ['hourly rate']);
  assert.deepEqual(missingTutorFields({ ...complete, rateMin: 400, rateMax: null }), []);
});

test('unknown levels do not count', () => {
  assert.deepEqual(missingTutorFields({ ...complete, teachingLevels: ['weekend'] }), ['teaching levels']);
});

test('normalizeTeachingLevels filters, dedupes and orders', () => {
  assert.deepEqual(normalizeTeachingLevels(['adult', 'primary', 'x', 'adult']), ['primary', 'adult']);
  assert.deepEqual(normalizeTeachingLevels('primary'), []);
});

test('TEACHING_LEVELS order and labels', () => {
  assert.deepEqual(
    TEACHING_LEVELS.map((level) => level.value),
    ['primary', 'lower_secondary', 'upper_secondary', 'university', 'adult'],
  );
  assert.equal(TEACHING_LEVELS[1].label, 'Lower secondary (ม.ต้น)');
});

test('tutorListingStatus: private hides even a complete tutor', () => {
  assert.deepEqual(tutorListingStatus({ ...complete, visibility: 'private' }), {
    listed: false,
    missing: [],
    hiddenByPrivacy: true,
  });
});

test('tutorListingStatus: public, matched_only and missing settings are listed when complete', () => {
  for (const visibility of ['public', 'matched_only', null]) {
    assert.deepEqual(tutorListingStatus({ ...complete, visibility }), { listed: true, missing: [], hiddenByPrivacy: false });
  }
});

test('tutorListingStatus: incomplete is not listed', () => {
  assert.equal(tutorListingStatus({ ...complete, rateMin: 0, visibility: 'public' }).listed, false);
});

test('no contact details hides the tutor', () => {
  assert.deepEqual(missingTutorFields({ ...complete, hasContact: false }), ['contact details']);
});

test('tutorSetupChecklist mirrors the listing rule, in order', () => {
  const items = tutorSetupChecklist({ ...complete, hasContact: false, rateMin: null, rateMax: null, visibility: 'private' });
  assert.deepEqual(
    items.map((item) => [item.label, item.done]),
    [
      ['Set a display name', true],
      ['Add subjects you teach', true],
      ['Set your hourly rate (250+ THB)', false],
      ['Choose the levels you teach', true],
      ['Add at least one contact channel', false],
      ['Visibility is not set to Private', false],
    ],
  );
});

test('tutorSetupChecklist is all done exactly when the tutor is listed', () => {
  const input = { ...complete, visibility: 'public' };
  assert.equal(tutorSetupChecklist(input).every((item) => item.done), tutorListingStatus(input).listed);
  const hidden = { ...complete, hasContact: false, visibility: 'public' };
  assert.equal(tutorSetupChecklist(hidden).every((item) => item.done), tutorListingStatus(hidden).listed);
});
