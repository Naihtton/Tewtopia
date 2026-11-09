// Tests share one database and run in order (node:test runs a file's tests sequentially).
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { as, errorOf, freshDb, reset, rows, signUp } from './harness.mjs';

const T = '11111111-1111-1111-1111-111111111111'; // tutor
const S = '22222222-2222-2222-2222-222222222222'; // student
const A = '33333333-3333-3333-3333-333333333333'; // tried to sign up as admin
const L = '44444444-4444-4444-4444-444444444444'; // legacy account (no profile row)

let db;

before(async () => {
  db = await freshDb();
  await signUp(db, T, 'tutor@x.com', { role: 'tutor', display_name: ' Pim ' });
  await signUp(db, S, 'stud@x.com', { display_name: 'Nok' });
  await signUp(db, A, 'adm@x.com', { role: 'admin' });
});

const listed = () => rows(db, `select * from public.public_tutor_cards`);

async function makeTutorComplete() {
  await reset(db);
  await db.exec(`
    update public.profiles set preferred_subjects = '{Math}' where id = '${T}';
    update public.tutor_profiles set hourly_rate_min = 300, hourly_rate_max = 500, teaching_levels = '{primary}', contact_line = 'pimline' where id = '${T}';
    update public.user_settings set profile_visibility = 'public' where id = '${T}';
  `);
}

test('sign-up trigger creates rows from metadata', async () => {
  const profiles = await rows(db, `select id::text, role, display_name from public.profiles`);
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  assert.equal(byId[T].role, 'tutor');
  assert.equal(byId[T].display_name, 'Pim');
  assert.equal(byId[S].role, 'student');
  assert.equal(byId[A].role, 'student', 'role admin in metadata becomes student');

  const settings = Object.fromEntries(
    (await rows(db, `select id::text, profile_visibility from public.user_settings`)).map((s) => [s.id, s.profile_visibility]),
  );
  assert.equal(settings[T], 'public');
  assert.equal(settings[S], 'matched_only');
  assert.equal((await rows(db, `select 1 from public.tutor_profiles where id = '${T}'`)).length, 1);
  assert.equal((await rows(db, `select 1 from public.tutor_profiles where id = '${S}'`)).length, 0);
});

test('tutor is listed only when complete, has a contact and is not private', async () => {
  await reset(db);
  assert.equal((await listed()).length, 0, 'incomplete tutor not listed');
  await db.exec(`
    update public.profiles set preferred_subjects = '{Math}' where id = '${T}';
    update public.tutor_profiles set hourly_rate_min = 300, hourly_rate_max = 500, teaching_levels = '{primary}' where id = '${T}';
  `);
  assert.equal((await listed()).length, 0, 'complete but no contact → not listed');
  await makeTutorComplete();
  const [card] = await listed();
  assert.ok(card, 'complete tutor listed');
  assert.equal('email' in card, false, 'view has no email');
  assert.equal(Object.keys(card).some((k) => k.startsWith('contact')), false, 'view has no contact columns');

  assert.equal(card.hourly_rate_min, 300);
  assert.equal(card.hourly_rate_max, 500);
  assert.equal('hourly_rate' in card, false, 'view exposes the range, not the legacy column');
  await makeTutorComplete();
  await db.exec(`update public.user_settings set profile_visibility = 'private' where id = '${T}'`);
  assert.equal((await listed()).length, 0, 'private hides');
  await db.exec(`update public.user_settings set profile_visibility = 'matched_only' where id = '${T}'`);
  assert.equal((await listed()).length, 1, 'matched_only still listed');
  await makeTutorComplete();
});

test('teaching levels and contact lengths are constrained', async () => {
  await reset(db);
  assert.ok(await errorOf(db, `update public.tutor_profiles set teaching_levels = '{weekend}' where id = $1`, [T]));
  assert.ok(await errorOf(db, `update public.tutor_profiles set contact_phone = $1 where id = $2`, ['9'.repeat(101), T]));
});

test('anon sees no base-table rows but can read the public view', async () => {
  await as(db, 'anon');
  for (const table of ['profiles', 'user_settings', 'tutor_profiles']) {
    assert.equal((await rows(db, `select * from public.${table}`)).length, 0, table);
  }
  assert.equal((await listed()).length, 1);
});

test('get_tutor_contacts: authenticated only, listed tutors only', async () => {
  await as(db, 'anon');
  assert.ok(await errorOf(db, `select * from public.get_tutor_contacts($1)`, [T]), 'anon cannot execute');

  await as(db, 'authenticated', S);
  const [contacts] = await rows(db, `select * from public.get_tutor_contacts($1)`, [T]);
  assert.equal(contacts.line, 'pimline');
  assert.equal(contacts.instagram, '');
  assert.equal((await rows(db, `select * from public.get_tutor_contacts($1)`, [S])).length, 0, 'non-listed user → nothing');
  assert.equal((await rows(db, `select contact_line from public.tutor_profiles where id = $1`, [T])).length, 0);

  await reset(db);
  await db.exec(`update public.user_settings set profile_visibility = 'private' where id = '${T}'`);
  await as(db, 'authenticated', S);
  assert.equal((await rows(db, `select * from public.get_tutor_contacts($1)`, [T])).length, 0, 'private tutor hidden');
  await makeTutorComplete();
});

test('signed-in users see only their own profile', async () => {
  await as(db, 'authenticated', S);
  assert.equal((await rows(db, `select * from public.profiles`)).length, 1);
});

test('role guard: no self-promotion to admin, student↔tutor allowed', async () => {
  await as(db, 'authenticated', S);
  assert.match(await errorOf(db, `update public.profiles set role = 'admin' where id = $1`, [S]), /role change not allowed/);

  await signUp(db, L, 'legacy@x.com');
  await db.exec(`delete from public.user_roles where user_id = '${L}'; delete from public.profiles where id = '${L}'`);
  await as(db, 'authenticated', L);
  assert.match(
    await errorOf(db, `insert into public.profiles (id, email, role) values ($1, 'legacy@x.com', 'admin')`, [L]),
    /role change not allowed/,
  );
  assert.equal(await errorOf(db, `insert into public.profiles (id, email, role) values ($1, 'legacy@x.com', 'student')`, [L]), null);
  assert.ok(await errorOf(db, `insert into public.user_roles (user_id, role) values ($1, 'admin')`, [L]));
  await errorOf(db, `update public.user_roles set role = 'admin' where user_id = $1`, [L]);
  await reset(db);
  const roles = await rows(db, `select role from public.user_roles where user_id = $1`, [L]);
  assert.equal(roles.some((r) => r.role === 'admin'), false);
});

test('rate range: 250 floor and min <= max are enforced', async () => {
  await reset(db);
  assert.ok(await errorOf(db, `update public.tutor_profiles set hourly_rate_min = 249, hourly_rate_max = 300 where id = $1`, [T]));
  assert.ok(await errorOf(db, `update public.tutor_profiles set hourly_rate_min = 500, hourly_rate_max = 300 where id = $1`, [T]));
  assert.equal(await errorOf(db, `update public.tutor_profiles set hourly_rate_min = 250, hourly_rate_max = 250 where id = $1`, [T]), null);
  await makeTutorComplete();
});

test('legacy hourly_rate is backfilled; sub-250 legacy tutors are unlisted', async () => {
  // A fresh database where tutors only have the legacy column, then schema.sql runs again.
  const legacy = await freshDb();
  const ok = '55555555-5555-5555-5555-555555555555';
  const low = '66666666-6666-6666-6666-666666666666';
  for (const [id, rate] of [[ok, 500], [low, 100]]) {
    await signUp(legacy, id, `${id}@x.com`, { role: 'tutor', display_name: 'T' });
    await legacy.exec(`
      update public.profiles set preferred_subjects = '{Math}' where id = '${id}';
      alter table public.tutor_profiles disable trigger all;
      update public.tutor_profiles set hourly_rate = ${rate}, hourly_rate_min = null, hourly_rate_max = null,
        teaching_levels = '{primary}', contact_line = 'x' where id = '${id}';
      alter table public.tutor_profiles enable trigger all;
    `);
  }
  const schema = (await import('node:fs')).readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
    .replace(/create extension if not exists pgcrypto;/, '');
  await legacy.exec(schema);
  const migrated = Object.fromEntries(
    (await rows(legacy, `select id::text, hourly_rate_min, hourly_rate_max from public.tutor_profiles`)).map((r) => [r.id, r]),
  );
  assert.deepEqual([migrated[ok].hourly_rate_min, migrated[ok].hourly_rate_max], [500, 500]);
  assert.deepEqual([migrated[low].hourly_rate_min, migrated[low].hourly_rate_max], [100, 100]);
  const listedIds = (await rows(legacy, `select id::text from public.public_tutor_cards`)).map((r) => r.id);
  assert.deepEqual(listedIds, [ok]);

  // The tutor later clears their rate; re-running schema.sql must not copy the legacy value back.
  await legacy.exec(`update public.tutor_profiles set hourly_rate_min = null, hourly_rate_max = null where id = '${ok}'`);
  await legacy.exec(schema);
  const [after] = await rows(legacy, `select hourly_rate_min, hourly_rate_max from public.tutor_profiles where id = $1`, [ok]);
  assert.deepEqual([after.hourly_rate_min, after.hourly_rate_max], [null, null], 'cleared rate stays cleared');
});

test('student contacts: own row only, length-checked', async () => {
  await as(db, 'authenticated', S);
  assert.equal(
    await errorOf(db, `insert into public.student_profiles (user_id, contact_line) values ($1, 'noklin')
      on conflict (user_id) do update set contact_line = excluded.contact_line`, [S]),
    null,
  );
  assert.equal((await rows(db, `select contact_line from public.student_profiles where user_id = $1`, [S]))[0].contact_line, 'noklin');
  assert.ok(await errorOf(db, `update public.student_profiles set contact_phone = $1 where user_id = $2`, ['9'.repeat(101), S]));

  await as(db, 'authenticated', T);
  assert.equal((await rows(db, `select * from public.student_profiles where user_id = $1`, [S])).length, 0, 'others cannot read');
  await as(db, 'anon');
  assert.equal((await rows(db, `select * from public.student_profiles`)).length, 0);
  await reset(db);
});

const avatarUrl = (owner, file = '1.webp') => `https://abc.supabase.co/storage/v1/object/public/avatars/${owner}/${file}`;

test('avatars bucket: public, 5MB, images only', async () => {
  await reset(db);
  const [bucket] = await rows(db, `select * from storage.buckets where id = 'avatars'`);
  assert.ok(bucket, 'bucket exists');
  assert.equal(bucket.public, true);
  assert.equal(Number(bucket.file_size_limit), 5 * 1024 * 1024);
  assert.deepEqual(bucket.allowed_mime_types, ['image/jpeg', 'image/png', 'image/webp']);
});

test('avatars: users write only inside their own folder', async () => {
  await as(db, 'anon');
  assert.ok(await errorOf(db, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${S}/a.webp`]), 'anon cannot upload');

  await as(db, 'authenticated', S);
  assert.equal(await errorOf(db, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${S}/a.webp`]), null);
  assert.ok(await errorOf(db, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${T}/a.webp`]), 'not into another user’s folder');
  assert.ok(await errorOf(db, `insert into storage.objects (bucket_id, name) values ('avatars', 'a.webp')`), 'not at the bucket root');

  await as(db, 'authenticated', T);
  await db.query(`delete from storage.objects where name = $1`, [`${S}/a.webp`]);
  await reset(db);
  assert.equal((await rows(db, `select 1 from storage.objects where name = $1`, [`${S}/a.webp`])).length, 1, 'others cannot delete it');

  await as(db, 'authenticated', S);
  await db.query(`delete from storage.objects where name = $1`, [`${S}/a.webp`]);
  await reset(db);
  assert.equal((await rows(db, `select 1 from storage.objects where name = $1`, [`${S}/a.webp`])).length, 0, 'owner can delete it');
});

test('profiles.avatar_url must point at the user’s own avatar folder', async () => {
  await as(db, 'authenticated', S);
  assert.equal(await errorOf(db, `update public.profiles set avatar_url = $1 where id = $2`, [avatarUrl(S), S]), null);
  assert.equal(await errorOf(db, `update public.profiles set avatar_url = null where id = $1`, [S]), null);
  assert.match(await errorOf(db, `update public.profiles set avatar_url = $1 where id = $2`, [avatarUrl(T), S]), /avatar/i);
  assert.match(await errorOf(db, `update public.profiles set avatar_url = $1 where id = $2`, ['https://evil.com/x.png', S]), /avatar/i);
  assert.match(
    await errorOf(db, `update public.profiles set avatar_url = $1 where id = $2`, [avatarUrl(S, '../x.webp'), S]),
    /avatar/i,
  );
});

test('public_tutor_cards exposes the tutor avatar', async () => {
  await reset(db);
  await db.query(`update public.profiles set avatar_url = $1 where id = $2`, [avatarUrl(T), T]);
  await as(db, 'anon');
  const [card] = await listed();
  assert.equal(card.avatar_url, avatarUrl(T));
  await reset(db);
});
