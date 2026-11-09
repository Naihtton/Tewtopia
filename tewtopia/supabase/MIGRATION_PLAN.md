# Tewtopia Schema Migration Plan

This document explains how to move from the current app-compatible schema to the normalized schema in `schema.sql` without breaking the existing product.

## Current principle

Do not delete the old app-facing columns yet.

The current frontend still reads and writes these legacy fields:

- `profiles.role`
- `profiles.preferred_subjects`
- `tutor_profiles.teaching_modes`

These are still valid for now and are intentionally kept in `schema.sql` for compatibility.

## What counts as "old"

There are two kinds of "old" structures:

1. Old tables we still keep as core tables
These are not legacy. They remain part of the long-term schema:

- `profiles`
- `user_settings`
- `tutor_profiles`

2. Old columns that will become compatibility fields
These should eventually be replaced by normalized relations:

- `profiles.role`
- `profiles.preferred_subjects`
- `tutor_profiles.teaching_modes`

## What is new in schema v2

Schema v2 adds normalized and future-facing tables:

- `user_roles`
- `student_profiles`
- `subjects`
- `tutor_subjects`
- `student_subject_interests`
- `tutor_teaching_modes`
- `tutor_requests`
- `matches`
- `sessions`
- `documents`

## Recommended migration phases

### Phase 1: Safe expansion

Run `schema.sql` as-is.

Goal:

- keep the current app working
- create the new tables
- start storing future data without deleting anything

After this phase:

- current profile/settings/tutor-profile pages should still work
- new tables will exist but may still be unused by the frontend

### Phase 2: Dual-write

Update the app so writes go to both old and new structures.

Examples:

- when saving a tutor role, also ensure `user_roles` contains `tutor`
- when saving preferred subjects, also write to `student_subject_interests` or `tutor_subjects`
- when saving teaching modes, also write to `tutor_teaching_modes`

Goal:

- old UI still works
- new normalized data starts filling up

### Phase 3: Read from normalized tables

Once enough data is backfilled and dual-write is stable:

- stop reading `profiles.preferred_subjects`
- stop reading `tutor_profiles.teaching_modes`
- use `user_roles` instead of trusting only `profiles.role`

Goal:

- normalized schema becomes the source of truth

### Phase 4: Deprecate old columns

Only after the frontend and backend no longer depend on them:

- remove `profiles.preferred_subjects`
- remove `tutor_profiles.teaching_modes`
- optionally keep `profiles.role` as a cached primary role, or remove it if `user_roles` is enough

Goal:

- final clean schema

## What to do with old tables right now

Do not drop anything that the current app uses.

Current action:

- keep `profiles`
- keep `user_settings`
- keep `tutor_profiles`
- keep current columns that the UI reads

The only things you should treat as "future replacement fields" are:

- `profiles.role`
- `profiles.preferred_subjects`
- `tutor_profiles.teaching_modes`

## Source of truth plan

Recommended long-term source of truth:

- user roles: `user_roles`
- tutor subjects: `tutor_subjects`
- student interests: `student_subject_interests`
- teaching modes: `tutor_teaching_modes`
- tutor visibility: `user_settings.profile_visibility`
- tutor discovery: join `profiles` + `user_settings` + `tutor_profiles` + normalized tutor tables

## Immediate next implementation order

1. Keep current profile/settings/tutor-profile pages working
2. Add subject and teaching-mode synchronization to normalized tables
3. Build `tutor_requests`
4. Switch browse tutors to read normalized tutor data
5. Remove reliance on compatibility columns

## Practical answer to "what should I do with old tables?"

Short answer:

- keep the old app-facing structures for now
- do not delete them yet
- mark old columns as compatibility fields
- migrate in phases

Do not do a destructive rewrite in one step.
