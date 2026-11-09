import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AVATAR_MAX_BYTES, avatarObjectPath, avatarPathFromUrl, validateAvatarFile } from './avatar.ts';

const uid = '22222222-2222-2222-2222-222222222222';

test('validateAvatarFile accepts jpeg, png and webp up to 5MB', () => {
  assert.equal(AVATAR_MAX_BYTES, 5 * 1024 * 1024);
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validateAvatarFile({ type, size: 1000 }), null, type);
  }
  assert.equal(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES }), null);
});

test('validateAvatarFile rejects other types, empty and oversized files', () => {
  assert.match(validateAvatarFile({ type: 'image/gif', size: 1000 }) ?? '', /JPG, PNG or WebP/);
  assert.match(validateAvatarFile({ type: 'image/svg+xml', size: 1000 }) ?? '', /JPG, PNG or WebP/);
  assert.match(validateAvatarFile({ type: 'image/png', size: 0 }) ?? '', /empty/);
  assert.match(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 }) ?? '', /5MB/);
});

test('avatarObjectPath puts the file in the user’s own folder', () => {
  assert.equal(avatarObjectPath(uid, 1700000000000), `${uid}/1700000000000.webp`);
  // Safari can't encode WebP from a canvas and falls back to PNG.
  assert.equal(avatarObjectPath(uid, 1700000000000, 'image/png'), `${uid}/1700000000000.png`);
});

test('avatarPathFromUrl extracts the object path of an avatars public URL', () => {
  const url = `https://abc.supabase.co/storage/v1/object/public/avatars/${uid}/1700000000000.webp`;
  assert.equal(avatarPathFromUrl(url), `${uid}/1700000000000.webp`);
  assert.equal(avatarPathFromUrl(`${url}?v=2`), `${uid}/1700000000000.webp`);
  assert.equal(avatarPathFromUrl('https://evil.com/x.png'), null);
  assert.equal(avatarPathFromUrl(null), null);
});
