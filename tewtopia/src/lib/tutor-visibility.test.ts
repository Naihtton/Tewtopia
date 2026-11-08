import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingTutorFields, normalizeTeachingLevels, TEACHING_LEVELS } from './tutor-visibility.ts';

const complete = { displayName: 'Pim', hourlyRate: 500, subjects: ['Math'], teachingLevels: ['primary'] };

test('complete tutor has nothing missing', () => {
  assert.deepEqual(missingTutorFields(complete), []);
});

test('reports each missing field in order', () => {
  assert.deepEqual(
    missingTutorFields({ displayName: '  ', hourlyRate: 0, subjects: [], teachingLevels: [] }),
    ['display name', 'hourly rate', 'subjects', 'teaching levels'],
  );
});

test('negative or null rate counts as missing', () => {
  assert.deepEqual(missingTutorFields({ ...complete, hourlyRate: -1 }), ['hourly rate']);
  assert.deepEqual(missingTutorFields({ ...complete, hourlyRate: null }), ['hourly rate']);
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
