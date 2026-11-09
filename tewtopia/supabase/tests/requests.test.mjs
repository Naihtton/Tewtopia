// Request board: student_requests, request_offers and their transition functions.
// Tests share one database and run in order.
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { as, errorOf, freshDb, reset, rows, signUp } from './harness.mjs';

const T = '11111111-1111-1111-1111-111111111111'; // listed tutor
const T2 = '12121212-1212-1212-1212-121212121212'; // second listed tutor
const U = '13131313-1313-1313-1313-131313131313'; // unlisted tutor
const S = '22222222-2222-2222-2222-222222222222'; // student with a contact
const N = '23232323-2323-2323-2323-232323232323'; // student without contacts

let db;
let requestId;
let offerT;
let offerT2;

const one = async (sql, params) => (await rows(db, sql, params))[0];
const call = (fn, ...args) =>
  one(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')}) as result`, args).then((r) => r.result);

async function listTutor(id) {
  await reset(db);
  await db.exec(`
    update public.profiles set preferred_subjects = '{Mathematics}' where id = '${id}';
    update public.tutor_profiles set hourly_rate_min = 300, hourly_rate_max = 500,
      teaching_levels = '{primary}', contact_line = 'line-${id.slice(0, 4)}' where id = '${id}';
  `);
}

const slots = (...list) => JSON.stringify(list);
const validSlots = slots({ day: 'mon', start: '15:30', end: '16:30' }, { day: 'sat', start: '09:00', end: '11:00' });
const validRequest = [['Mathematics'], ['primary'], 'Derivatives for midterm', validSlots, ['online']];

before(async () => {
  db = await freshDb();
  await signUp(db, T, 't@x.com', { role: 'tutor', display_name: 'Pim' });
  await signUp(db, T2, 't2@x.com', { role: 'tutor', display_name: 'Krit' });
  await signUp(db, U, 'u@x.com', { role: 'tutor', display_name: 'Unlisted' });
  await signUp(db, S, 's@x.com', { display_name: 'Nok' });
  await signUp(db, N, 'n@x.com', { display_name: 'NoContact' });
  await listTutor(T);
  await listTutor(T2);
  await reset(db);
  await db.exec(`insert into public.student_profiles (user_id, contact_phone) values ('${S}', '0812345678')`);
});

test('create_request: students with a contact only, fields validated', async () => {
  await as(db, 'anon');
  assert.ok(await errorOf(db, `select public.create_request($1, $2, $3, $4, $5)`, validRequest), 'anon cannot');

  await as(db, 'authenticated', N);
  assert.match(await errorOf(db, `select public.create_request($1, $2, $3, $4, $5)`, validRequest), /contact/i);

  await as(db, 'authenticated', T);
  assert.match(await errorOf(db, `select public.create_request($1, $2, $3, $4, $5)`, validRequest), /student/i);

  await as(db, 'authenticated', S);
  for (const bad of [
    [[], ['primary'], '', validSlots, ['online']],
    [['Mathematics'], [], '', validSlots, ['online']],
    [['Mathematics'], ['primary'], '', validSlots, []],
    [['Mathematics'], ['primary'], 'x'.repeat(1001), validSlots, ['online']],
    [['Mathematics'], ['weekend'], '', validSlots, ['online']],
    [['Mathematics'], ['primary'], '', validSlots, ['weekend']],
    [['Basket weaving'], ['primary'], '', validSlots, ['online']],
    [['Mathematics', 'Physics'], ['primary'], '', validSlots, ['online']], // one subject per request
    // schedule slots
    [['Mathematics'], ['primary'], '', '[]', ['online']],
    [['Mathematics'], ['primary'], '', slots({ day: 'fun', start: '09:00', end: '10:00' }), ['online']],
    [['Mathematics'], ['primary'], '', slots({ day: 'mon', start: '09:15', end: '10:00' }), ['online']],
    [['Mathematics'], ['primary'], '', slots({ day: 'mon', start: '05:30', end: '10:00' }), ['online']],
    [['Mathematics'], ['primary'], '', slots({ day: 'mon', start: '10:00', end: '10:00' }), ['online']],
    [['Mathematics'], ['primary'], '', slots({ day: 'mon', start: '09:00', end: '10:00' }, { day: 'mon', start: '11:00', end: '12:00' }), ['online']],
    [['Mathematics'], ['primary'], '', '{"day":"mon"}', ['online']],
  ]) {
    assert.ok(await errorOf(db, `select public.create_request($1, $2, $3, $4, $5)`, bad), JSON.stringify(bad));
  }

  requestId = await call('create_request', ...validRequest);
  assert.ok(requestId);
});

test('direct writes are blocked; owners read their own rows', async () => {
  await as(db, 'authenticated', S);
  assert.ok(await errorOf(db, `update public.student_requests set status = 'closed' where id = $1`, [requestId]).then((e) => e ?? 'no-op'));
  const [mine] = await rows(db, `select status from public.student_requests where id = $1`, [requestId]);
  assert.equal(mine.status, 'open', 'direct update had no effect');
  assert.ok(await errorOf(db, `insert into public.request_offers (request_id, tutor_user_id, hourly_rate) values ($1, $2, 300)`, [requestId, T]).then((e) => e ?? 'no-op'));

  await as(db, 'authenticated', T);
  assert.equal((await rows(db, `select * from public.student_requests`)).length, 0, 'tutor without an offer cannot read the request row');
});

test('public_request_cards: open posts with the student display name only, anon readable', async () => {
  await as(db, 'anon');
  const cards = await rows(db, `select * from public.public_request_cards`);
  assert.equal(cards.length, 1);
  const card = cards[0];
  assert.equal(card.id, requestId);
  assert.equal(card.offer_count, 0);
  assert.equal(card.student_name, 'Nok');
  assert.deepEqual(card.schedule_slots, [
    { day: 'mon', start: '15:30', end: '16:30' },
    { day: 'sat', start: '09:00', end: '11:00' },
  ]);
  for (const key of Object.keys(card)) {
    assert.equal(/student_user_id|email|contact|phone|line/.test(key), false, `column ${key} must not expose the student`);
  }
});

test('submit_offer: listed tutors only, 250 floor, not on own request', async () => {
  await as(db, 'anon');
  assert.ok(await errorOf(db, `select public.submit_offer($1, 400)`, [requestId]));
  await as(db, 'authenticated', U);
  assert.match(await errorOf(db, `select public.submit_offer($1, 400)`, [requestId]), /listed|available|tutor profile/i);
  await as(db, 'authenticated', S);
  assert.ok(await errorOf(db, `select public.submit_offer($1, 400)`, [requestId]));
  await as(db, 'authenticated', T);
  assert.ok(await errorOf(db, `select public.submit_offer($1, 249)`, [requestId]));

  offerT = await call('submit_offer', requestId, 400);
  const again = await call('submit_offer', requestId, 450);
  assert.equal(again, offerT, 'second submit updates the same offer');
  const [offer] = await rows(db, `select hourly_rate, status from public.request_offers where id = $1`, [offerT]);
  assert.deepEqual([offer.hourly_rate, offer.status], [450, 'pending']);

  await as(db, 'authenticated', T2);
  offerT2 = await call('submit_offer', requestId, 600);
  await as(db, 'anon');
  assert.equal((await one(`select offer_count from public.public_request_cards where id = $1`, [requestId])).offer_count, 2);
});

test('offer prices are private to the request owner and the offering tutor', async () => {
  await as(db, 'authenticated', T2);
  const seen = await rows(db, `select id from public.request_offers`);
  assert.deepEqual(seen.map((r) => r.id), [offerT2], 'a tutor sees only their own offer');
  await as(db, 'authenticated', S);
  assert.equal((await rows(db, `select id from public.request_offers`)).length, 2, 'owner sees all offers on their request');
  await as(db, 'authenticated', T);
  assert.equal((await rows(db, `select id from public.student_requests`)).length, 1, 'tutor with an offer can read the request row');
});

test('withdraw then resubmit revives the same offer', async () => {
  await as(db, 'authenticated', T2);
  await call('withdraw_offer', offerT2);
  assert.equal((await one(`select status from public.request_offers where id = $1`, [offerT2])).status, 'withdrawn');
  assert.equal(await call('submit_offer', requestId, 550), offerT2);
  assert.equal((await one(`select status, hourly_rate from public.request_offers where id = $1`, [offerT2])).status, 'pending');
  await as(db, 'authenticated', T);
  assert.ok(await errorOf(db, `select public.withdraw_offer($1)`, [offerT2]), 'cannot withdraw someone else’s offer');
});

test('counterpart is hidden until accepted', async () => {
  await as(db, 'authenticated', T);
  assert.equal((await rows(db, `select * from public.get_offer_counterpart($1)`, [offerT])).length, 0);
  await as(db, 'authenticated', S);
  assert.equal((await rows(db, `select * from public.get_offer_counterpart($1)`, [offerT])).length, 0);
});

test('accept_offer: owner only; tutor must still be listed', async () => {
  await as(db, 'authenticated', T);
  assert.ok(await errorOf(db, `select public.accept_offer($1)`, [offerT]), 'tutor cannot accept own offer');
  await as(db, 'authenticated', N);
  assert.ok(await errorOf(db, `select public.accept_offer($1)`, [offerT]), 'other student cannot accept');

  await reset(db);
  await db.exec(`update public.user_settings set profile_visibility = 'private' where id = '${T2}'`);
  await as(db, 'authenticated', S);
  assert.match(await errorOf(db, `select public.accept_offer($1)`, [offerT2]), /no longer available/);
  await reset(db);
  await db.exec(`update public.user_settings set profile_visibility = 'public' where id = '${T2}'`);

  await as(db, 'authenticated', S);
  await call('accept_offer', offerT);
  assert.equal((await one(`select status from public.request_offers where id = $1`, [offerT])).status, 'accepted');
  assert.ok(await errorOf(db, `select public.accept_offer($1)`, [offerT]), 'cannot accept twice');
});

test('counterpart after accept: both directions', async () => {
  await as(db, 'authenticated', T);
  const student = await one(`select * from public.get_offer_counterpart($1)`, [offerT]);
  assert.equal(student.display_name, 'Nok');
  assert.equal(student.phone, '0812345678');

  await as(db, 'authenticated', S);
  const tutor = await one(`select * from public.get_offer_counterpart($1)`, [offerT]);
  assert.equal(tutor.display_name, 'Pim');
  assert.equal(tutor.line, `line-${T.slice(0, 4)}`);

  await as(db, 'authenticated', T2);
  assert.equal((await rows(db, `select * from public.get_offer_counterpart($1)`, [offerT])).length, 0, 'other tutor gets nothing');
});

test('attention counts', async () => {
  await as(db, 'authenticated', S);
  assert.deepEqual(await one(`select * from public.my_attention_counts()`), { pending_offers: 1, accepted_offers: 0 });
  await as(db, 'authenticated', T);
  assert.deepEqual(await one(`select * from public.my_attention_counts()`), { pending_offers: 0, accepted_offers: 1 });
});

test('decline hides contacts again; declined offers cannot be resubmitted', async () => {
  await as(db, 'authenticated', S);
  await call('accept_offer', offerT2);
  await call('decline_offer', offerT2);
  await as(db, 'authenticated', T2);
  assert.equal((await rows(db, `select * from public.get_offer_counterpart($1)`, [offerT2])).length, 0);
  assert.ok(await errorOf(db, `select public.submit_offer($1, 500)`, [requestId]));
});

test('confirm_deal by the tutor closes the request and other offers', async () => {
  // A third tutor with a pending offer, to be closed by the deal.
  const T3 = '14141414-1414-1414-1414-141414141414';
  await signUp(db, T3, 't3@x.com', { role: 'tutor', display_name: 'Third' });
  await listTutor(T3);
  await as(db, 'authenticated', T3);
  const offerT3 = await call('submit_offer', requestId, 700);

  await as(db, 'authenticated', T2);
  assert.ok(await errorOf(db, `select public.confirm_deal($1)`, [offerT]), 'other tutor cannot confirm');

  await as(db, 'authenticated', T);
  await call('confirm_deal', offerT);
  await reset(db);
  assert.equal((await one(`select status from public.student_requests where id = $1`, [requestId])).status, 'closed');
  assert.equal((await one(`select status from public.request_offers where id = $1`, [offerT])).status, 'deal_done');
  assert.equal((await one(`select status from public.request_offers where id = $1`, [offerT3])).status, 'closed');
  assert.equal((await one(`select status from public.request_offers where id = $1`, [offerT2])).status, 'declined', 'declined stays declined');

  await as(db, 'anon');
  assert.equal((await rows(db, `select * from public.public_request_cards`)).length, 0, 'closed post leaves the board');

  await as(db, 'authenticated', S);
  assert.ok(await errorOf(db, `select public.decline_offer($1)`, [offerT]), 'cannot decline after the deal');
  assert.equal((await rows(db, `select * from public.get_offer_counterpart($1)`, [offerT])).length, 1, 'deal_done keeps contacts');
});

test('cancel_request closes open offers; only the owner can cancel', async () => {
  await as(db, 'authenticated', S);
  const second = await call('create_request', ...validRequest);
  await as(db, 'authenticated', T);
  const offer = await call('submit_offer', second, 300);
  assert.ok(await errorOf(db, `select public.cancel_request($1)`, [second]), 'tutor cannot cancel');

  await as(db, 'authenticated', S);
  await call('cancel_request', second);
  await reset(db);
  assert.equal((await one(`select status from public.student_requests where id = $1`, [second])).status, 'cancelled');
  assert.equal((await one(`select status from public.request_offers where id = $1`, [offer])).status, 'closed');
  await as(db, 'authenticated', T);
  assert.ok(await errorOf(db, `select public.submit_offer($1, 300)`, [second]), 'no offers on a cancelled request');
});

test('a student who switched to tutor still manages their own requests', async () => {
  await as(db, 'authenticated', S);
  const third = await call('create_request', ...validRequest);
  await reset(db);
  await db.exec(`update public.profiles set role = 'tutor' where id = '${S}'`);
  await as(db, 'authenticated', S);
  assert.equal(await errorOf(db, `select public.cancel_request($1)`, [third]), null);
});
