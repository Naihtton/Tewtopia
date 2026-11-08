import assert from 'node:assert/strict';
import { test } from 'node:test';
import { postAuthDestination, safeNextPath } from './auth-redirect.ts';

test('safeNextPath accepts internal paths', () => {
  assert.equal(safeNextPath('/tutors'), '/tutors');
  assert.equal(safeNextPath('/main/tutor-profile?x=1'), '/main/tutor-profile?x=1');
});

test('safeNextPath rejects anything that can leave the site', () => {
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'tutors', '', null, undefined]) {
    assert.equal(safeNextPath(bad), null, String(bad));
  }
});

test('postAuthDestination prefers a safe next', () => {
  assert.equal(postAuthDestination({ next: '/tutors', mode: 'login', role: 'tutor' }), '/tutors');
});

test('postAuthDestination defaults', () => {
  assert.equal(postAuthDestination({ next: null, mode: 'login', role: 'student' }), '/main/dashboard');
  assert.equal(postAuthDestination({ next: null, mode: 'signup', role: 'student' }), '/tutors');
  assert.equal(postAuthDestination({ next: null, mode: 'signup', role: 'tutor' }), '/main/tutor-profile');
});
