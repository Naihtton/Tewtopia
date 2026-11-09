import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRate, isValidOfferRate, MIN_HOURLY_RATE, parseRateRange } from './rates.ts';

test('MIN_HOURLY_RATE is 250', () => {
  assert.equal(MIN_HOURLY_RATE, 250);
});

test('parseRateRange accepts a range and a single value', () => {
  assert.deepEqual(parseRateRange(300, 500), { ok: true, min: 300, max: 500 });
  assert.deepEqual(parseRateRange('400', ''), { ok: true, min: 400, max: 400 });
  assert.deepEqual(parseRateRange(400, null), { ok: true, min: 400, max: 400 });
});

test('parseRateRange enforces the 250 floor and order', () => {
  for (const [min, max] of [
    [249, 300],
    [500, 300],
    [null, null],
    ['abc', 300],
    [300.5, 400],
    ['', ''],
  ]) {
    assert.equal(parseRateRange(min, max).ok, false, `${min}-${max}`);
  }
  assert.equal(parseRateRange(250, 250).ok, true);
});

test('isValidOfferRate', () => {
  assert.equal(isValidOfferRate(250), true);
  assert.equal(isValidOfferRate(1200), true);
  for (const bad of [249, 0, -1, 300.5, '300', null, Number.NaN]) {
    assert.equal(isValidOfferRate(bad), false, String(bad));
  }
});

test('formatRate', () => {
  assert.equal(formatRate(300, 500), '300–500 THB/hr');
  assert.equal(formatRate(500, 500), '500 THB/hr');
  assert.equal(formatRate(500, null), '500 THB/hr');
  assert.equal(formatRate(null, null), 'Rate not set');
});
