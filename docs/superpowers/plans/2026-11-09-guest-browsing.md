# Guest Browsing + Sign-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone can browse tutors at `/tutors` without logging in, and new users can sign up (choosing student or tutor) from the same page as log-in, returning to where they came from.

**Architecture:** Public tutor data is served only through a Postgres view `public_tutor_cards` (no `email`), readable by `anon` and `authenticated`; the old "view public tutor" RLS policies are dropped. A trigger on `auth.users` creates `profiles` / `user_settings` / `tutor_profiles` rows from sign-up metadata. Redirect and visibility rules live in small pure modules with unit tests (Node's built-in test runner).

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr`, Supabase Postgres + RLS, Tailwind v4, Node 23 `node --test` (type stripping).

**Spec:** `docs/superpowers/specs/2026-11-09-guest-browsing-design.md` (Thai). Read it alongside this plan.

All paths below are relative to `tewtopia/` unless they start with `docs/`.

## Global Constraints

- No new runtime dependencies. Tests use `node --test` only.
- `supabase/schema.sql` must stay idempotent: `create or replace`, `drop ... if exists`, `add column if not exists`.
- Never grant `anon` select on `profiles`, `user_settings` or `tutor_profiles`. The `email` column must never appear in `public_tutor_cards`.
- Sign-up roles accepted: `student`, `tutor` only. Anything else, or missing, becomes `student`.
- Teaching levels, in this order, with these labels: `primary` "Primary (ประถม)", `lower_secondary` "Lower secondary (ม.ต้น)", `upper_secondary` "Upper secondary (ม.ปลาย)", `university` "University", `adult` "Adult learners".
- A tutor is listed when all hold: role `tutor`; `display_name` not blank; `hourly_rate > 0`; at least 1 subject (`profiles.preferred_subjects`); at least 1 teaching level; `profile_visibility` is not `private` (a missing settings row counts as listed).
- New tutors get `profile_visibility = 'public'`; new students keep the column default.
- Password minimum: 8 characters.
- Must work with Supabase email confirmation both on and off, without code changes.
- Styling uses `ui` tokens from `src/lib/ui.ts` and `TopNav` from `src/app/_components/top-nav.tsx`.

## Review Focus

1. `?next=` values like `//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:…`, or an empty string must fall back to the default destination, never leave the site. Covered by Task 1's tests.
2. A signed-in tutor opening `/tutors` should see the list. Today's page redirects tutors away. Covered by Task 4's manual check.
3. An existing user who signed up before the trigger existed, with no `profiles` row, must still log in and reach the dashboard. The current fallback in `getCurrentUserProfile` covers this, and it must not be removed. Covered by Task 5's manual check.
4. A tutor whose `hourly_rate` is `0` or negative, or whose levels contain an unknown string, must not be listed. Covered by Task 1's tests (`missingTutorFields`) and by the view filter in Task 2.
5. Switching between the log-in and sign-up forms must keep `next`, so a visitor who arrived from a gated action still returns there after signing up. Covered by Task 5's manual check.

---

### Task 1: Pure helpers for redirects and tutor visibility, plus a test runner

**Files:**
- Create: `src/lib/auth-redirect.ts`, `src/lib/auth-redirect.test.ts`
- Create: `src/lib/tutor-visibility.ts`, `src/lib/tutor-visibility.test.ts`
- Modify: `package.json` (add a script), `tsconfig.json` (add `"allowImportingTsExtensions": true`, needed because the tests import `./x.ts`)

**Interfaces:**
- Produces, in `auth-redirect.ts` (no `@/` imports, so Node can run it directly):
  - `safeNextPath(value: string | null | undefined): string | null`
  - `postAuthDestination(opts: { next: string | null; mode: 'login' | 'signup'; role: 'student' | 'tutor' }): string`
- Produces, in `tutor-visibility.ts` (no `@/` imports):
  - `TEACHING_LEVELS: readonly { value: TeachingLevel; label: string }[]`, in the Global Constraints order
  - `type TeachingLevel = 'primary' | 'lower_secondary' | 'upper_secondary' | 'university' | 'adult'`
  - `normalizeTeachingLevels(values: unknown): TeachingLevel[]`: keeps only known values, deduplicated, in `TEACHING_LEVELS` order
  - `missingTutorFields(input: { displayName: string; hourlyRate: number | null; subjects: string[]; teachingLevels: string[] }): Array<'display name' | 'hourly rate' | 'subjects' | 'teaching levels'>`

- [ ] **Step 1: Add the test script.** In `package.json` scripts, add `"test": "node --test \"src/**/*.test.ts\""`. Add `"allowImportingTsExtensions": true` to `tsconfig.json` `compilerOptions`.

- [ ] **Step 2: Write the failing tests** in `src/lib/auth-redirect.test.ts`, using `node:test` and `node:assert/strict`, importing `./auth-redirect.ts`:

```ts
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
```

Write the tests in `src/lib/tutor-visibility.test.ts`:

```ts
const complete = { displayName: 'Pim', hourlyRate: 500, subjects: ['Math'], teachingLevels: ['primary'] };
test('complete tutor has nothing missing', () => assert.deepEqual(missingTutorFields(complete), []));
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
  assert.deepEqual(TEACHING_LEVELS.map((l) => l.value), ['primary', 'lower_secondary', 'upper_secondary', 'university', 'adult']);
  assert.equal(TEACHING_LEVELS[1].label, 'Lower secondary (ม.ต้น)');
});
```

- [ ] **Step 3: Run `npm test`.** Expected: FAIL (module not found).
- [ ] **Step 4: Implement both modules** with the signatures above. `safeNextPath` returns the value only when it starts with `/`, its second character is not `/` or `\`, and it contains no `\`. `missingTutorFields` counts only levels that `normalizeTeachingLevels` keeps.
- [ ] **Step 5: Run `npm test`, then `npx tsc --noEmit`.** Expected: all tests PASS and tsc reports no errors.
- [ ] **Step 6: Commit** `feat: add redirect and tutor-visibility helpers with tests`

---

### Task 2: Database: levels column, sign-up trigger, admin guard, public view

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: column `tutor_profiles.teaching_levels text[] not null default '{}'`, constrained to the five values with `teaching_levels <@ array['primary','lower_secondary','upper_secondary','university','adult']`.
- Produces: view `public.public_tutor_cards` with exactly these columns: `id uuid, display_name text, headline text, about text, subjects text[], teaching_levels text[], teaching_modes text[], hourly_rate integer, years_experience integer, bio text`.
- Produces: function and trigger `public.handle_new_user()` `after insert on auth.users`.
- Produces: function and trigger `public.guard_profile_role()` `before update of role on public.profiles`.

- [ ] **Step 1: Add the column** after the `tutor_profiles` table: `alter table ... add column if not exists teaching_levels ...`, plus the check constraint (drop it if it exists, then add it).
- [ ] **Step 2: Add `handle_new_user()`** as `security definer set search_path = public`.
  - Read `new.raw_user_meta_data->>'role'` (only `tutor` stays `tutor`, everything else becomes `student`) and `->>'display_name'` (trimmed, default `''`).
  - Insert into `profiles (id, email, display_name, role)` with `on conflict (id) do nothing`.
  - Insert into `user_settings (id, profile_visibility)`, using `'public'` for tutors and the column default for students, `on conflict do nothing`.
  - If the role is tutor, insert into `tutor_profiles (id)` with `on conflict do nothing`.
  - Place it after all three tables exist.
- [ ] **Step 3: Add `guard_profile_role()`.**
  - If `old.role is distinct from new.role` and either side is `'admin'`, and `auth.role()` is not `'service_role'`, raise an exception `'role change not allowed'`.
  - Create the trigger `before update of role`.
- [ ] **Step 4: Drop the three exposing policies.** Use `drop policy if exists` on "Authenticated users can view public tutor profiles" (profiles), "Authenticated users can view public tutor cards" (tutor_profiles) and "Authenticated users can view public settings rows" (user_settings), and delete their `create policy` blocks.
- [ ] **Step 5: Create the view.**
  - Write it as `create or replace view public.public_tutor_cards as select ... from profiles p join tutor_profiles t on t.id = p.id left join user_settings s on s.id = p.id where ...`.
  - The `where` clause applies the Global Constraints rule: `btrim(p.display_name) <> ''`, `t.hourly_rate > 0`, `cardinality(p.preferred_subjects) > 0`, `cardinality(t.teaching_levels) > 0`, `coalesce(s.profile_visibility, 'public') <> 'private'`.
  - Leave out `security_invoker`, so the view runs with owner rights. Add a comment explaining that this is deliberate.
  - Add `revoke all on public.public_tutor_cards from public;` and `grant select on public.public_tutor_cards to anon, authenticated;`.
- [ ] **Step 6: Ask the user to run the whole `supabase/schema.sql` in the Supabase SQL Editor.** This is a human step: the agent has no database access. Expected: the run succeeds, and running it a second time also succeeds.
- [ ] **Step 7: Verify as anon.** Load the URL and key from `.env.local`; never print the key.
  - `curl -s "$URL/rest/v1/profiles?select=id" -H "apikey: $KEY"` should return `[]`.
  - The same call for `user_settings` and `tutor_profiles` should return `[]`.
  - `curl -s "$URL/rest/v1/public_tutor_cards?select=*" -H "apikey: $KEY"` should return a JSON array, and no object in it should have an `email` key.
- [ ] **Step 8: Commit** `feat(db): public tutor view, sign-up trigger, role guard, teaching levels`

---

### Task 3: Tutor profile: teaching levels and visibility status

**Files:**
- Modify: `src/app/api/tutor-profile/route.ts`
- Modify: `src/lib/tutor-profiles.ts` (the `TutorProfile` type, row type, mapper and default)
- Modify: `src/app/main/tutor-profile/_components/tutor-profile-form.tsx`
- Modify: `src/app/main/tutor-profile/page.tsx`, if the form needs profile name and subjects passed in

**Interfaces:**
- Consumes: `TEACHING_LEVELS`, `normalizeTeachingLevels` and `missingTutorFields` from Task 1. Import them via `@/lib/tutor-visibility` in app code.
- Produces: `TutorProfile.teachingLevels: TeachingLevel[]`. The API GET/PATCH JSON gains `teaching_levels: string[]`. PATCH accepts `teachingLevels: string[]` and stores `normalizeTeachingLevels(body.teachingLevels)`.

- [ ] **Step 1: Thread the levels through the API and lib.** Add `teaching_levels` to every `select(...)` string and every default object in the route and in `tutor-profiles.ts`. PATCH writes the normalized list.
- [ ] **Step 2: Add the levels to the form.**
  - Show "Levels you teach" as one checkbox per `TEACHING_LEVELS` entry, showing the label, with state `teachingLevels: TeachingLevel[]`.
  - Send the array on save.
  - Add "Levels" to the summary panel.
- [ ] **Step 3: Add the status block** at the top of the form card, computed with `missingTutorFields({ displayName, hourlyRate, subjects: profile.preferredSubjects, teachingLevels })`.
  - When nothing is missing: an emerald note, "Visible to students on Find tutors."
  - Otherwise: "Hidden from students — still missing: {list joined with ', '}."
  - For a missing display name or subjects, add a link "Edit in Profile" to `/main/profile`.
  - Note: the status reflects completeness only. A tutor who set `private` in Settings is still hidden.
- [ ] **Step 4: Run `npx tsc --noEmit && npm run lint && npm test`.** Expected: all pass.
- [ ] **Step 5: Manual check, after Task 2 is applied.**
  - As a tutor, save rate 500, one subject and one level. The status should say Visible.
  - The anon `curl` of `public_tutor_cards` should include this tutor.
  - Untick all levels and save. The tutor should disappear from the view.
- [ ] **Step 6: Commit** `feat: teaching levels and visibility status on tutor profile`

---

### Task 4: Public `/tutors` page and guest navigation

**Files:**
- Create: `src/app/tutors/page.tsx`
- Modify: `src/app/main/tutors/page.tsx` (make it only `redirect('/tutors')`)
- Modify: `src/lib/tutor-profiles.ts` (replace `listVisibleTutorsForStudents`)
- Modify: `src/app/_components/top-nav.tsx`, `src/app/page.tsx`
- Modify: `src/app/main/settings/_components/settings-form.tsx:36` (the `matched_only` copy)

**Interfaces:**
- Consumes: the `public_tutor_cards` view (Task 2) and `TEACHING_LEVELS` (Task 1) for labels.
- Produces: `listPublicTutorCards(): Promise<{ tutors: BrowseTutorCard[]; error: string | null }>`.
  - It reads the view with one query.
  - `BrowseTutorCard` gains `teachingLevels: string[]`.
  - `preferredSubjects` maps from `subjects`.
  - `headline` falls back to `'Tutor'` when empty.
  - `about` falls back to `bio`.
- Produces: `TopNav` guest variant tabs `[{ href: '/tutors', label: 'Find tutors' }]`. The signed-in student tab "Find tutors" and the student CTA "Find a tutor" point to `/tutors`.

- [ ] **Step 1: Replace `listVisibleTutorsForStudents`** with `listPublicTutorCards`. Delete the old three-query version. It must not touch `profiles`, `user_settings` or `tutor_profiles`.
- [ ] **Step 2: Build `src/app/tutors/page.tsx`.**
  - It is a server component.
  - It calls `getCurrentUserProfile()`. A `null` result means a guest; there is no redirect.
  - Render `TopNav` with `user` set or `null`, wrapped like `MainShell`. Reuse `MainShell` when signed in and an equivalent `ui.shell` wrapper for guests.
  - Move the card markup from the old `main/tutors/page.tsx`, add a "Levels" chip row using the labels, and keep the empty and error states.
  - Change the subtitle to "Browse tutors and compare subjects, levels and rates." and drop the "Privacy settings" button.
- [ ] **Step 3: Update `TopNav`.**
  - Guest: logo, the "Find tutors" tab (shown on desktop and mobile), and "Log in", which links to `/auth?next=<current path>` when the current path is not `/auth`.
  - Make the tab active styling work for `/tutors`.
- [ ] **Step 4: Update the home page and Settings copy.**
  - `src/app/page.tsx`: "Get Started" links to `/tutors`.
  - Settings `matched_only` description: "Same as public until matching is available."
- [ ] **Step 5: Run `npx tsc --noEmit && npm run lint && npm run build`.** Expected: all pass, and the route list shows `/tutors`.
- [ ] **Step 6: Manual check.**
  - In a private window, open `/tutors`. The listed tutor shows a price and levels, and there is no email in View Source.
  - Log in as a tutor and open `/tutors`. The list shows, with no redirect.
  - `/main/tutors` goes to `/tutors`.
- [ ] **Step 7: Commit** `feat: public /tutors page and guest navigation`

---

### Task 5: Sign-up on the auth page, `next` support, email-confirm callback

**Files:**
- Modify: `src/app/auth/page.tsx` (read `searchParams.next` and `searchParams.mode`, and pass both to the form)
- Modify: `src/app/auth/_components/auth-form.tsx`
- Create: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `safeNextPath` and `postAuthDestination` from Task 1.
- Produces: `/auth?mode=signup&next=/x` opens the sign-up form. `/auth/callback?code=…&next=/x` exchanges the code and redirects.

- [ ] **Step 1: Pass the params into the auth page.**
  - It accepts `searchParams: Promise<{ next?: string; mode?: string }>` (Next 15).
  - When already signed in, it redirects to `safeNextPath(next) ?? '/main/dashboard'`.
  - It passes `next` (the sanitized value) and `initialMode` (`'signup'` only when `mode === 'signup'`) to the form.
  - The title changes with the mode: "Log in" or "Create your account".
- [ ] **Step 2: Build the auth form.**
  - **Modes:** the form has `login` and `signup` modes. The switch link reads "Don't have an account? Create one" or "Already have an account? Log in", and it updates the URL `mode` while keeping `next`.
  - **Sign-up fields:**
    - Two large selectable cards, "I'm a student" and "I'm a tutor", styled like the Profile role cards. One must be chosen before submitting.
    - Display name, required.
    - Email.
    - Password, `minLength={8}`.
  - **Submit:** call `supabase.auth.signUp({ email, password, options: { data: { role, display_name }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}` } })`, where `destination = postAuthDestination({ next, mode: 'signup', role })`.
  - **After sign-up:**
    - If `data.session` exists: `router.push(destination)`, then `router.refresh()`.
    - Otherwise: show "Check your email to confirm your account, then come back to log in." in place of the form.
  - **Log-in success:** push `postAuthDestination({ next, mode: 'login', role: 'student' })`. The role is irrelevant for log-in.
- [ ] **Step 3: Write `src/app/auth/callback/route.ts`.**
  - It exports `GET(request)`.
  - It reads `code` and `next` and calls `(await createClient()).auth.exchangeCodeForSession(code)`.
  - On success it redirects to `new URL(safeNextPath(next) ?? '/main/dashboard', request.url)`.
  - On a missing code or an error, it redirects to `/auth?error=confirm`. The auth page shows "That confirmation link is invalid or expired." when `error=confirm`.
- [ ] **Step 4: Run `npx tsc --noEmit && npm run lint && npm test && npm run build`.** Expected: all pass.
- [ ] **Note for the user (for when email confirmation is turned on later):** add `http://localhost:3000/auth/callback` and the production equivalent to Supabase → Authentication → URL Configuration → Redirect URLs. Otherwise Supabase ignores `emailRedirectTo`.
- [ ] **Step 5: Manual check, with email confirmation OFF in Supabase.**
  - Sign up as a student. You land on `/tutors`, and Supabase has a `profiles` row with role student.
  - Sign up as a tutor. You land on `/main/tutor-profile`, and `profiles` (role tutor), `tutor_profiles` and `user_settings` (`public`) rows exist.
  - Open `/auth?next=/tutors`, switch to sign-up and back, then log in. You land on `/tutors`.
  - `/auth?next=//evil.com` → log in → you land on `/main/dashboard`.
  - Call `signUp` from the browser console with `data: { role: 'admin' }`. The profile role is `student`.
  - A user created before the trigger, with no `profiles` row, can still log in and reach the dashboard.
- [ ] **Step 6: Commit** `feat: sign-up with role choice, next redirects, email confirm callback`

---

### Task 6: Whole-branch verification

- [ ] **Step 1: Run `npm test && npx tsc --noEmit && npm run lint && npm run build`.** Expected: all pass.
- [ ] **Step 2: Walk the spec's acceptance list** (`docs/.../2026-11-09-guest-browsing-design.md`, "การตรวจรับ" items 1–8 and 1a). Tick each one or record the failure.
- [ ] **Step 3: Grep for leftovers.** `grep -rn "listVisibleTutorsForStudents\|/main/tutors" src` should show only the redirect page.
