import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAuthCallback, postAuthDestination, safeNextPath } from './auth-redirect.ts';

test('safeNextPath accepts internal paths', () => {
  assert.equal(safeNextPath('/tutors'), '/tutors');
  assert.equal(safeNextPath('/main/tutor-profile?x=1'), '/main/tutor-profile?x=1');
});

test('safeNextPath rejects anything that can leave the site', () => {
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'tutors', '', null, undefined]) {
    assert.equal(safeNextPath(bad), null, String(bad));
  }
});

test('safeNextPath rejects control characters that URL parsing strips', () => {
  for (const bad of ['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '/\u0000/evil.com', '/ /evil.com', '/\u007f/x']) {
    assert.equal(safeNextPath(bad), null, JSON.stringify(bad));
  }
});

test('safeNextPath keeps query and hash', () => {
  assert.equal(safeNextPath('/tutors?subject=math#top'), '/tutors?subject=math#top');
});

test('postAuthDestination prefers a safe next', () => {
  assert.equal(postAuthDestination({ next: '/tutors', mode: 'login', role: 'tutor' }), '/tutors');
});

test('postAuthDestination defaults', () => {
  assert.equal(postAuthDestination({ next: null, mode: 'login', role: 'student' }), '/main/dashboard');
  assert.equal(postAuthDestination({ next: null, mode: 'signup', role: 'student' }), '/tutors');
  assert.equal(postAuthDestination({ next: null, mode: 'signup', role: 'tutor' }), '/main/tutor-profile');
});

test('parseAuthCallback prefers token_hash (works on any device)', () => {
  const params = new URLSearchParams('token_hash=abc&type=signup&next=/tutors');
  assert.deepEqual(parseAuthCallback(params), { kind: 'otp', tokenHash: 'abc', type: 'signup', next: '/tutors' });
});

test('parseAuthCallback falls back to a PKCE code', () => {
  assert.deepEqual(parseAuthCallback(new URLSearchParams('code=xyz')), { kind: 'code', code: 'xyz', next: '/main/dashboard' });
});

test('parseAuthCallback rejects unknown types and empty links, and sanitizes next', () => {
  assert.equal(parseAuthCallback(new URLSearchParams('token_hash=abc&type=recovery')).kind, 'invalid');
  assert.equal(parseAuthCallback(new URLSearchParams('')).kind, 'invalid');
  assert.equal(parseAuthCallback(new URLSearchParams('code=x&next=//evil.com')).next, '/main/dashboard');
});
