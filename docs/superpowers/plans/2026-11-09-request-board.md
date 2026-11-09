# Request Board + Offers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students post what they need, listed tutors send a single-price offer, and students accept or decline it. Accepted pairs see each other's contacts, and either side can confirm the deal, which closes the post. Tutor profile rates become a range with a 250 THB/hr floor.

**Architecture:** Two new tables (`student_requests`, `request_offers`) with read-only RLS for owners. Every state change goes through `security definer` SQL functions that enforce who may do what. The public board reads a view with no student identity, mirroring `public_tutor_cards`. Business rules that the UI also needs (rate validation, request validation, which actions an offer allows) live in pure TS modules with `node --test` tests. SQL is tested in PGlite, using a harness committed in this plan.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr`, Supabase Postgres + RLS, Tailwind v4, `node --test`, `@electric-sql/pglite` (devDependency only).

**Spec:** `docs/superpowers/specs/2026-11-09-request-board-design.md` (Thai). Read it alongside this plan.

Paths are relative to `tewtopia/` unless they start with `docs/`.

## Global Constraints

- No new runtime dependencies. `@electric-sql/pglite` may be added as a devDependency only.
- `supabase/schema.sql` stays idempotent: running it twice must succeed.
- Hourly rate floor: **250** THB/hr. It applies to the tutor profile range (min ≥ 250, max ≥ min) and to the offer price (≥ 250). It is enforced in the forms and as DB check constraints.
- Offer price is a single integer. The profile rate is `hourly_rate_min`–`hourly_rate_max`. When min = max, display "500 THB/hr"; otherwise display "300–500 THB/hr".
- There is no budget field anywhere. An offer's price is visible only to the student who owns the request and to the tutor who made it. The public board shows only the offer **count**.
- Student identity (name, contacts) is never visible on the board, and is visible only to a tutor whose offer is `accepted` or `deal_done`.
- Offer statuses: `pending | accepted | declined | deal_done | closed | withdrawn`. Request statuses: `open | closed | cancelled`.
- Only one offer is allowed per (request, tutor). Submitting on a `withdrawn` row revives it to `pending`. A `declined` or `closed` row cannot be resubmitted.
- Request fields:
  - `subjects`: ≥1 value, from the `subjects` table names.
  - `teaching_levels`: ≥1 of the 5 existing values.
  - `teaching_modes`: ≥1 of `online | in_person | group | hybrid`.
  - `schedule`: required, ≤200 characters.
  - `details`: optional, ≤1000 characters.
- A student needs ≥1 contact channel (Instagram / Facebook / Phone / Line, each ≤100 characters) before posting.
- Do not touch the existing `tutor_requests` / `matches` tables.
- Do not delete or rebuild the user's dev `.next` folder. Run `next build` in a copy (see the Task 9 command).

## Review Focus

1. **Two tabs racing on the same offer** (student declines while the tutor confirms the deal) must end in one consistent state, never a deal on a declined offer. Every transition function checks the current status in its `where` clause.
2. **A tutor who stops being listed after an offer was accepted** keeps seeing the student's contacts until decline, deal or cancel (this is a spec ruling). A new `accept_offer` on that tutor must fail with a readable message.
3. **A student who switches role to tutor** can still cancel their own requests and accept or decline offers on them. Ownership checks use `student_user_id = auth.uid()`, not the current role.
4. **Profile rates migrated from the old `hourly_rate`**: a value below 250 makes the tutor unlisted. The tutor profile status must say "hourly rate" is missing, not crash.
5. **The board modal opened from a shared link (`/requests?request=<id>`) for a request that has since closed** shows a "no longer open" message instead of an empty modal.

---

### Task 1: Commit the PGlite DB test harness

**Files:**
- Create: `supabase/tests/schema.test.mjs`, `supabase/tests/harness.mjs`
- Modify: `package.json`, adding the devDependency `@electric-sql/pglite@0.2.17` and the script `"test:db": "node --test supabase/tests/"`

**Interfaces:**
- Produces, in `harness.mjs`:
  - `export async function freshDb(): Promise<PGlite>`. It creates roles `anon` / `authenticated` / `service_role`, the `auth` schema with `auth.users(id uuid pk, email text, raw_user_meta_data jsonb)`, and `auth.uid()` / `auth.role()` reading `request.jwt.claim.sub` / `request.jwt.claim.role`. It runs `schema.sql` twice, with `create extension ... pgcrypto` stripped. It then grants select/insert/update/delete on all public tables and execute on all public functions to anon/authenticated, mimicking Supabase defaults before the schema's own revokes.
  - `export async function as(db, role: 'anon'|'authenticated'|'service_role', userId?: string): Promise<void>`
  - `export async function reset(db): Promise<void>`
  - `export async function signUp(db, id, email, meta): Promise<void>`. It inserts into `auth.users` as superuser, which fires the trigger.

- [ ] **Step 1: Port the 31 existing assertions.** They currently live in the scratchpad `run.mjs`. Move them into `schema.test.mjs` as `node:test` tests built on the helpers: sign-up trigger, role guard (update and insert), `user_roles` limits, `public_tutor_cards` rules, `get_tutor_contacts`, and the contact length check. Keep the test names close to the old PASS labels.
- [ ] **Step 2: `npm install -D @electric-sql/pglite@0.2.17`, then run `npm run test:db`.** Expected: all pass against the current `main` schema.
- [ ] **Step 3: Commit** `test: commit PGlite schema test harness`

---

### Task 2: Rate range with a 250 floor (pure helpers and DB)

**Files:**
- Create: `src/lib/rates.ts`, `src/lib/rates.test.ts`
- Modify: `src/lib/tutor-visibility.ts` and its test, `supabase/schema.sql`, `supabase/tests/schema.test.mjs`

**Interfaces:**
- Produces, in `rates.ts` (no `@/` imports):
  - `MIN_HOURLY_RATE = 250`
  - `parseRateRange(min: unknown, max: unknown): { ok: true; min: number; max: number } | { ok: false; error: string }`. An empty max means max = min. It accepts numbers or numeric strings and rejects non-integers.
  - `isValidOfferRate(value: unknown): value is number`
  - `formatRate(min: number | null, max: number | null): string`
- Changes `missingTutorFields` / `tutorListingStatus` / `tutorSetupChecklist`: the input `hourlyRate` is replaced by `rateMin: number | null; rateMax: number | null`. `'hourly rate'` is reported as missing unless `parseRateRange(rateMin, rateMax).ok`. The checklist label becomes `'Set your hourly rate (250+ THB)'`.
- DB:
  - `tutor_profiles.hourly_rate_min integer`, `hourly_rate_max integer`.
  - Check constraint `tutor_profiles_rate_range_check`: both null, or `min >= 250 and max >= min`.
  - `public_tutor_cards` exposes `hourly_rate_min`, `hourly_rate_max` in place of `hourly_rate`.

- [ ] **Step 1: Write the failing tests** in `rates.test.ts`:

```ts
test('parseRateRange accepts a range and a single value', () => {
  assert.deepEqual(parseRateRange(300, 500), { ok: true, min: 300, max: 500 });
  assert.deepEqual(parseRateRange('400', ''), { ok: true, min: 400, max: 400 });
});
test('parseRateRange enforces the 250 floor and order', () => {
  for (const [min, max] of [[249, 300], [500, 300], [null, null], ['abc', 300], [300.5, 400]]) {
    assert.equal(parseRateRange(min, max).ok, false, `${min}-${max}`);
  }
  assert.equal(parseRateRange(250, 250).ok, true);
});
test('isValidOfferRate', () => {
  assert.equal(isValidOfferRate(250), true);
  for (const bad of [249, 0, -1, 300.5, '300', null]) assert.equal(isValidOfferRate(bad), false, String(bad));
});
test('formatRate', () => {
  assert.equal(formatRate(300, 500), '300–500 THB/hr');
  assert.equal(formatRate(500, 500), '500 THB/hr');
  assert.equal(formatRate(null, null), 'Rate not set');
});
```

  Update `tutor-visibility.test.ts`: `complete` uses `rateMin: 300, rateMax: 500`. Add `rateMin: 200` → `['hourly rate']` and `rateMin: 500, rateMax: 300` → `['hourly rate']`.
- [ ] **Step 2: Add the DB tests (RED)** to `schema.test.mjs`:
  - A complete tutor with range 300–500 is listed. The view has `hourly_rate_min` / `hourly_rate_max` and no `hourly_rate`.
  - Min 249 is rejected by the constraint.
  - A legacy row with `hourly_rate = 500` and null min/max is backfilled to 500/500 after the schema runs.
  - A legacy `hourly_rate = 100` gives min/max 100, which bypasses the constraint (see Step 4), and that tutor is unlisted.
- [ ] **Step 3: Run `npm test` and `npm run test:db`.** Expected: FAIL.
- [ ] **Step 4: Implement `rates.ts` and the listing-rule change. Then the SQL:**
  - Add the columns.
  - Backfill: `update tutor_profiles set hourly_rate_min = hourly_rate, hourly_rate_max = hourly_rate where hourly_rate is not null and hourly_rate_min is null`.
  - Add the constraint as `not valid`, so legacy sub-250 rows survive but new writes are checked.
  - Change the view's where clause to `t.hourly_rate_min >= 250 and t.hourly_rate_max >= t.hourly_rate_min`.
  - **Drop and recreate** `public_tutor_cards`, because a column is renamed. Function `get_tutor_contacts` depends on it, so drop that first and recreate it after. Re-apply both grant/revoke blocks.
  - Leave the `hourly_rate` column in place but unused.
- [ ] **Step 5: Run `npm test && npm run test:db`.** Expected: all PASS.
- [ ] **Step 6: Commit** `feat: tutor rate range with 250 THB/hr floor`

---

### Task 3: Rate range in the tutor profile UI, cards and checklist

**Files:**
- Modify: `src/lib/tutor-profiles.ts` (types, selects, mapper; `BrowseTutorCard` gets `rateMin` / `rateMax` in place of `hourlyRate`), `src/lib/tutor-listing.ts`, `src/app/api/tutor-profile/route.ts`, `src/app/main/tutor-profile/_components/tutor-profile-form.tsx`, `src/app/tutors/_components/tutor-browser.tsx`

**Interfaces:**
- Consumes: `parseRateRange`, `formatRate` and `MIN_HOURLY_RATE` from Task 2.
- Produces:
  - `TutorProfile.rateMin` / `rateMax: number | null`.
  - API PATCH accepts `rateMin`, `rateMax`. It returns 400 with `parseRateRange`'s error when both are present but invalid; when both are empty it stores null/null.

- [ ] **Step 1: Thread `hourly_rate_min/max` through** the lib, the API and `tutor-listing.ts`, replacing every `hourly_rate` / `hourlyRate` usage that the earlier grep listed.
- [ ] **Step 2: Update the form.**
  - Two inputs, "From (THB/hr)" and "To (THB/hr, optional)", with `min={250}`.
  - Helper text: "Minimum 250 THB/hr. Leave 'To' empty for a single rate."
  - Show inline errors from `parseRateRange` before submitting.
- [ ] **Step 3: Update the cards and modal** in `tutor-browser.tsx` to show `formatRate(rateMin, rateMax)` with "per hour" removed, since it is already in the string.
- [ ] **Step 4: Run `npx tsc --noEmit && npm run lint && npm test`.** Expected: pass. Then `grep -rn "hourlyRate\|hourly_rate[^_]" src` should return nothing.
- [ ] **Step 5: Commit** `feat: rate range on tutor profile and Find tutors`

---

### Task 4: Shared contact helpers and student contacts

**Files:**
- Rename: `src/lib/tutor-contact.ts` → `src/lib/contact.ts` and its test, updating all imports
- Modify: `supabase/schema.sql`, `supabase/tests/schema.test.mjs`, `src/app/api/profile/route.ts`, `src/lib/profiles.ts`, `src/app/main/profile/_components/profile-form.tsx`

**Interfaces:**
- Produces:
  - `UserProfile.contacts: ContactDetails`, read from `student_profiles`. Empty for tutors and for students with no row.
  - API PATCH `/api/profile` accepts `contacts`. For students it upserts `student_profiles (user_id, contact_*)`.
- DB:
  - `student_profiles.contact_instagram|facebook|phone|line text not null default ''`.
  - Length check of ≤100 each.
  - The existing own-row RLS applies, with no new read path.

- [ ] **Step 1: DB test (RED).**
  - A student can upsert their own `student_profiles` contacts.
  - Another authenticated user selecting that row gets 0 rows.
  - A value over 100 characters is rejected.
- [ ] **Step 2: Implement the SQL, the rename, the lib and the API.** In the Profile page, students see a "Contact details" section with the same 4 inputs and helper text "Shown only to tutors whose offer you accept." Tutors don't see this section; theirs is on Tutor profile.
- [ ] **Step 3: Run `npm test && npm run test:db && npx tsc --noEmit && npm run lint`.** Expected: pass.
- [ ] **Step 4: Commit** `feat: student contact details`

---

### Task 5: Requests and offers in the DB

**Files:**
- Modify: `supabase/schema.sql`, `supabase/tests/schema.test.mjs`

**Interfaces (all `security definer`, `set search_path = public`, `execute` granted to `authenticated` only, revoked from `public, anon`):**

| Function | Who | Checks | Effect / returns |
|---|---|---|---|
| `create_request(subjects text[], teaching_levels text[], details text, schedule text, teaching_modes text[]) returns uuid` | caller | role = student; ≥1 student contact; field rules from Global Constraints | new `open` row |
| `cancel_request(request uuid) returns void` | owner | status = `open` | request → `cancelled`; its `pending` / `accepted` offers → `closed` |
| `submit_offer(request uuid, rate integer) returns uuid` | caller | in `public_tutor_cards`; request `open` and not own; rate ≥ 250 | insert `pending`; or update the rate if own row is `pending`; or revive `withdrawn` → `pending`. Raise on `declined` / `closed` / `accepted` / `deal_done` |
| `withdraw_offer(offer uuid)` | offer's tutor | status `pending` | → `withdrawn` |
| `accept_offer(offer uuid)` | request owner | offer `pending`, request `open`, tutor still in `public_tutor_cards` (else raise `'This tutor is no longer available'`) | → `accepted` |
| `decline_offer(offer uuid)` | request owner | offer `pending` or `accepted` | → `declined` |
| `confirm_deal(offer uuid)` | owner or offer's tutor | offer `accepted`, request `open` | offer → `deal_done`; request → `closed`; other `pending` / `accepted` offers on it → `closed` |
| `get_offer_counterpart(offer uuid) returns table(display_name text, instagram text, facebook text, phone text, line text)` | owner or tutor of that offer | offer `accepted` or `deal_done` | the *other* party: for the student, the tutor's name and contacts; for the tutor, the student's name and `student_profiles` contacts |
| `my_attention_counts() returns table(pending_offers int, accepted_offers int)` | caller | — | `pending_offers` = pending offers on the caller's `open` requests; `accepted_offers` = the caller's offers in `accepted` |

- Tables:
  - `student_requests` and `request_offers`, with columns and checks per the spec and Global Constraints.
  - `unique (request_id, tutor_user_id)`.
  - Index on `request_offers(request_id)`.
- RLS (select only, with no insert / update / delete policies):
  - Request owner reads own requests.
  - A tutor reads requests they have an offer on.
  - Request owner reads offers on own requests.
  - A tutor reads own offers.
- View `public_request_cards`: `id, subjects, teaching_levels, teaching_modes, details, schedule, created_at, offer_count`, where `offer_count` counts offers with status `pending` or `accepted`. It shows status `open` only. Same grant pattern as `public_tutor_cards`, with no `student_user_id`.
- Each transition updates with `where id = $1 and status = '<expected>'` and raises `'Offer is no longer <expected>'` if 0 rows changed (Review Focus 1).

- [ ] **Step 1: Write the DB tests (RED)** covering acceptance items 3–8:
  - anon reading `public_request_cards` sees no `student_user_id` and no names.
  - A student without contacts can't `create_request`.
  - An unlisted tutor or a student can't `submit_offer`.
  - Second submit updates the price.
  - Withdraw and resubmit revives the row.
  - `accept_offer` by a non-owner raises.
  - Accept when the tutor is no longer listed raises.
  - The counterpart is empty for `pending` / `declined` and filled for `accepted`, in both directions.
  - `confirm_deal` closes the request and the other offers.
  - Cancel closes the offers.
  - `decline_offer` after `confirm_deal` raises.
  - Attention counts match.
  - A rate of 249 raises.
- [ ] **Step 2: Run `npm run test:db`.** Expected: the new tests FAIL.
- [ ] **Step 3: Implement the SQL.**
- [ ] **Step 4: Run `npm run test:db`.** Expected: all PASS, including when the schema runs twice.
- [ ] **Step 5: Commit** `feat(db): student requests, offers and transition functions`

---

### Task 6: Pure request and offer rules

**Files:**
- Create: `src/lib/requests.ts`, `src/lib/requests.test.ts`

**Interfaces:**
- Produces, with no `@/` imports:
  - `TEACHING_MODES: readonly { value: 'online'|'in_person'|'group'|'hybrid'; label: string }[]`, with labels Online / In person / Group class / Hybrid.
  - `validateRequestInput(input: { subjects: string[]; teachingLevels: string[]; teachingModes: string[]; schedule: string; details: string }): { ok: true; value: same-shape-trimmed } | { ok: false; errors: Partial<Record<'subjects'|'teachingLevels'|'teachingModes'|'schedule'|'details', string>> }`
  - `type OfferStatus` and `type RequestStatus`.
  - `offerActions(offer: OfferStatus, request: RequestStatus, viewer: 'student'|'tutor'): Array<'accept'|'decline'|'confirm_deal'|'edit_price'|'withdraw'|'view_contact'>`
  - `OFFER_STATUS_LABEL: Record<OfferStatus, string>`, with values Pending, Accepted, Declined, Deal done, Closed, Withdrawn.

- [ ] **Step 1: Write the failing tests.**
  - `validateRequestInput`:
    - Empty arrays report errors on the three array fields.
    - A schedule of `'  '` is an error.
    - A schedule of 201 characters is an error.
    - Details of 1001 characters is an error.
    - A valid input is trimmed.
    - An unknown mode `'weekend'` is an error.
  - `offerActions` table:
    - (pending, open, student) → `['accept','decline']`
    - (accepted, open, student) → `['view_contact','confirm_deal','decline']`
    - (pending, open, tutor) → `['edit_price','withdraw']`
    - (accepted, open, tutor) → `['view_contact','confirm_deal']`
    - (deal_done, closed, either) → `['view_contact']`
    - (closed / declined / withdrawn, any) → `[]`
    - (pending, cancelled, student) → `[]`
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: request validation and offer action rules`

---

### Task 7: Public board `/requests`, modal and offer form

**Files:**
- Create: `src/app/requests/page.tsx`, `src/app/requests/_components/request-board.tsx`, `src/lib/request-board.ts` (server: `listOpenRequests()`)
- Modify: `src/app/tutors/_components/tutor-browser.tsx` (extract the `<dialog>` shell to `src/app/_components/modal.tsx` as `Modal({ labelledBy, onClose, children })` and reuse it)

**Interfaces:**
- Consumes: the `public_request_cards` view, `submit_offer` / `withdraw_offer` (Task 5), `TEACHING_MODES` and `isValidOfferRate` (Tasks 2 and 6), `TEACHING_LEVELS`.
- Produces:
  - `listOpenRequests(): Promise<{ requests: RequestCard[]; error: string | null }>`, where `RequestCard = { id; subjects: string[]; teachingLevels: string[]; teachingModes: string[]; details: string; schedule: string; createdAt: string; offerCount: number }`.
  - The page prop for the viewer is `viewer: 'guest' | 'student' | 'tutor-listed' | 'tutor-unlisted'`.

- [ ] **Step 1: Build the page.** It works like `/tutors`: shell by sign-in state, `?request=<id>` opens the modal, `history.replaceState` on open and close, newest first. Each card shows subjects, levels, modes, schedule, a 2-line clamp of details, "Posted <relative date>" and "<n> offers".
- [ ] **Step 2: Build the modal footer by viewer.**
  - `tutor-listed`: a price input (min 250) and the button "Send offer". If the tutor already has an offer on this request, which comes from their own `request_offers` rows, show its status and "Update price" / "Withdraw" while it is pending.
  - `tutor-unlisted`: "Finish your tutor profile to send offers" with a link.
  - `student`: "Only tutors can send offers."
  - `guest`: "Log in as a tutor to send an offer", linking to `/auth?next=/requests?request=<id>`.
  - A `?request=` id that isn't in the open list shows "This request is no longer open" (Review Focus 5).
- [ ] **Step 3: Run `npx tsc --noEmit && npm run lint`, then the isolated build (Task 9 command).** Expected: pass.
- [ ] **Step 4: Commit** `feat: public request board with offers`

---

### Task 8: Student "My requests", the post form, and tutor "My offers"

**Files:**
- Create: `src/app/main/requests/page.tsx`, `src/app/main/requests/new/page.tsx`, `src/app/main/requests/_components/*`, `src/app/main/offers/page.tsx`, `src/app/main/offers/_components/*`, `src/lib/my-requests.ts` (server reads)

**Interfaces:**
- Consumes: RLS reads (Task 5), `offerActions`, `OFFER_STATUS_LABEL`, `validateRequestInput` (Task 6), `get_offer_counterpart`, the transition functions, `formatRate`, `contactLinks`, and `Modal`.
- Produces: `listMyRequestsWithOffers()` and `listMyOffers()` in `src/lib/my-requests.ts`. Offers are joined to `public_tutor_cards` for the tutor's name and range. A tutor who is no longer listed shows as "Tutor (no longer listed)".

- [ ] **Step 1: Build `/main/requests/new`.**
  - Checkboxes for subjects (from the `subjects` table), levels and modes, plus schedule and details inputs.
  - If the student has no contact, render the 4 contact inputs in the form. Submit saves the contacts via `/api/profile` before calling `create_request`.
  - Show client-side errors from `validateRequestInput`.
  - On success, go to `/main/requests`.
  - Tutors who open the page are redirected to `/requests`.
- [ ] **Step 2: Build `/main/requests`.**
  - A "Post a request" button.
  - One card per request, showing status, summary and "Cancel request" while it is open.
  - Under each request, its offers: tutor name, a link that opens the tutor card modal (reusing `TutorBrowser`'s card), the offered price as "450 THB/hr", the status label, and the action buttons from `offerActions(…, 'student')`.
  - `view_contact` calls `get_offer_counterpart` and shows a `ContactList`.
  - Destructive actions (decline, cancel) ask for confirmation with `window.confirm`.
- [ ] **Step 3: Build `/main/offers` (tutor).**
  - One row per offer: request summary, my price, status, and the actions from `offerActions(…, 'tutor')`.
  - `view_contact` shows the student's display name and contacts.
  - `edit_price` is an inline input with a minimum of 250.
- [ ] **Step 4: Run `npx tsc --noEmit && npm run lint && npm test`, then the isolated build.** Expected: pass.
- [ ] **Step 5: Commit** `feat: my requests, post form and my offers`

---

### Task 9: Navigation, badges and full verification

**Files:**
- Modify: `src/app/_components/top-nav.tsx`, `src/app/main/_components/main-shell.tsx`, `src/app/main/layout.tsx`, `src/app/tutors/page.tsx`, `src/app/requests/page.tsx`

**Interfaces:**
- `NavUser` gains `badge: number`. Its value comes from `my_attention_counts()`: `pending_offers` for students, `accepted_offers` for tutors.
- Tabs:
  - **Student:** Dashboard · Find tutors (`/tutors`) · My requests (`/main/requests`, badge) · Profile · Settings
  - **Tutor:** Dashboard · Request board (`/requests`) · My offers (`/main/offers`, badge) · Tutor profile · Settings. The tutor's Profile link moves inside the Tutor profile page header.
  - **Guest:** Find tutors · Request board
- CTA:
  - Student: "Post a request" → `/main/requests/new`
  - Tutor: unchanged

- [ ] **Step 1: Implement the tabs and badges.** The badge is a small pill with color `bg-cta text-white`, hidden at 0.
- [ ] **Step 2: Run all checks:**

```bash
npm test && npm run test:db && npx tsc --noEmit && npm run lint
B=/private/tmp/claude-501/-Users-thian-Projects-Tewtopia/925bbf5d-8582-4b68-b398-e3e489321a2c/scratchpad/build-check
rm -rf $B && mkdir -p $B && rsync -a --exclude node_modules --exclude .next ./ $B/ && ln -s "$PWD/node_modules" $B/node_modules && (cd $B && npx next build)
```

  Expected: everything passes, and the route list includes `/requests`, `/main/requests`, `/main/requests/new` and `/main/offers`.
- [ ] **Step 3: Commit** `feat: request board navigation and badges`
- [ ] **Step 4: Hand-off.** The user re-runs `schema.sql`, then walks the spec's acceptance items 1–8 with one student and one listed tutor account.
