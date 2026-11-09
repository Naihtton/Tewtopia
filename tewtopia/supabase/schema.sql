-- Tewtopia schema v2
-- Goals:
-- 1. Keep current app-compatible fields so the existing UI keeps working
-- 2. Introduce normalized tables for roles, subjects, tutor requests, and future matching flows
-- 3. Support guest students browsing tutors without login
-- 4. Keep tutor/admin authenticated-only

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Core user profile
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'tutor', 'admin')),
  preferred_subjects text[] not null default '{}',
  bio text not null default '',
  status text not null default 'profile_incomplete' check (status in ('profile_incomplete', 'profile_ready', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Role model
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('student', 'tutor', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own roles" on public.user_roles;
create policy "Users can insert own roles"
on public.user_roles
for insert
to authenticated
with check ((select auth.uid()) = user_id and role in ('student', 'tutor'));

drop policy if exists "Users can update own roles" on public.user_roles;
create policy "Users can update own roles"
on public.user_roles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and role in ('student', 'tutor'));

-- Keeps user_roles in step with profiles.role. Runs as security definer because
-- user_roles has no delete policy: users must not be able to drop roles themselves.
-- A switched-away student/tutor role is removed; admin is never removed here.
create or replace function public.sync_primary_role_to_user_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, new.role)
  on conflict (user_id, role) do nothing;

  if tg_op = 'UPDATE' and old.role is distinct from new.role and old.role <> 'admin' then
    delete from public.user_roles
    where user_id = new.id
      and role = old.role;
  end if;

  return new;
end;
$$;

-- One-time cleanup for rows left behind before the trigger removed old roles.
delete from public.user_roles ur
using public.profiles p
where p.id = ur.user_id
  and ur.role in ('student', 'tutor')
  and ur.role <> p.role;

drop trigger if exists sync_profiles_role_to_user_roles on public.profiles;
create trigger sync_profiles_role_to_user_roles
after insert or update of role on public.profiles
for each row
execute function public.sync_primary_role_to_user_roles();

-- Shared user settings
create table if not exists public.user_settings (
  id uuid primary key references auth.users (id) on delete cascade,
  email_notifications boolean not null default true,
  session_reminders boolean not null default true,
  marketing_emails boolean not null default false,
  profile_visibility text not null default 'matched_only' check (profile_visibility in ('private', 'matched_only', 'public')),
  document_access text not null default 'private' check (document_access in ('private', 'tutors_only', 'matched_users')),
  auto_share_documents boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings"
on public.user_settings
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
on public.user_settings
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
on public.user_settings
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Removed: let any signed-in user read other users' full settings rows.
-- Public tutor data is served only through public_tutor_cards (below).
drop policy if exists "Authenticated users can view public settings rows" on public.user_settings;

-- Student-specific profile
create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  learning_goals text not null default '',
  preferred_learning_style text,
  level text,
  budget_min integer,
  budget_max integer,
  location_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_student_profiles_updated_at on public.student_profiles;
create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

alter table public.student_profiles enable row level security;

drop policy if exists "Users can view own student profile" on public.student_profiles;
create policy "Users can view own student profile"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own student profile" on public.student_profiles;
create policy "Users can insert own student profile"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own student profile" on public.student_profiles;
create policy "Users can update own student profile"
on public.student_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Student contact channels: shown only to a tutor whose offer the student
-- accepted, via get_offer_counterpart(). Own-row RLS above covers reads/writes.
alter table public.student_profiles add column if not exists contact_instagram text not null default '';
alter table public.student_profiles add column if not exists contact_facebook text not null default '';
alter table public.student_profiles add column if not exists contact_phone text not null default '';
alter table public.student_profiles add column if not exists contact_line text not null default '';

alter table public.student_profiles drop constraint if exists student_profiles_contact_length_check;
alter table public.student_profiles
add constraint student_profiles_contact_length_check
check (
  char_length(contact_instagram) <= 100
  and char_length(contact_facebook) <= 100
  and char_length(contact_phone) <= 100
  and char_length(contact_line) <= 100
);

-- Tutor-specific profile
create table if not exists public.tutor_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  headline text not null default '',
  hourly_rate integer,
  years_experience integer,
  teaching_modes text[] not null default '{}',
  about text not null default '',
  onboarding_status text not null default 'draft' check (onboarding_status in ('draft', 'ready', 'suspended')),
  is_accepting_students boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_tutor_profiles_updated_at on public.tutor_profiles;
create trigger set_tutor_profiles_updated_at
before update on public.tutor_profiles
for each row
execute function public.set_updated_at();

alter table public.tutor_profiles enable row level security;

drop policy if exists "Users can view own tutor profile" on public.tutor_profiles;
create policy "Users can view own tutor profile"
on public.tutor_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own tutor profile" on public.tutor_profiles;
create policy "Users can insert own tutor profile"
on public.tutor_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own tutor profile" on public.tutor_profiles;
create policy "Users can update own tutor profile"
on public.tutor_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

alter table public.tutor_profiles
add column if not exists teaching_levels text[] not null default '{}';

alter table public.tutor_profiles drop constraint if exists tutor_profiles_teaching_levels_check;
alter table public.tutor_profiles
add constraint tutor_profiles_teaching_levels_check
check (teaching_levels <@ array['primary', 'lower_secondary', 'upper_secondary', 'university', 'adult']::text[]);

-- Profile rate is a range (min-max THB/hr) with a 250 floor to discourage
-- undercutting. The legacy single hourly_rate column is kept but no longer used.
alter table public.tutor_profiles add column if not exists hourly_rate_min integer;
alter table public.tutor_profiles add column if not exists hourly_rate_max integer;

-- Drop first so the backfill isn't blocked on re-runs; re-added NOT VALID so
-- legacy sub-250 rates survive (those tutors are simply unlisted) while every
-- new write is checked.
alter table public.tutor_profiles drop constraint if exists tutor_profiles_rate_range_check;

update public.tutor_profiles
set hourly_rate_min = hourly_rate, hourly_rate_max = hourly_rate
where hourly_rate is not null and hourly_rate_min is null;

alter table public.tutor_profiles
add constraint tutor_profiles_rate_range_check
check (
  (hourly_rate_min is null and hourly_rate_max is null)
  or (hourly_rate_min >= 250 and hourly_rate_max >= hourly_rate_min)
) not valid;

-- Tutor contact channels. Never exposed by public_tutor_cards; signed-in users
-- read them one tutor at a time through get_tutor_contacts().
alter table public.tutor_profiles add column if not exists contact_instagram text not null default '';
alter table public.tutor_profiles add column if not exists contact_facebook text not null default '';
alter table public.tutor_profiles add column if not exists contact_phone text not null default '';
alter table public.tutor_profiles add column if not exists contact_line text not null default '';

alter table public.tutor_profiles drop constraint if exists tutor_profiles_contact_length_check;
alter table public.tutor_profiles
add constraint tutor_profiles_contact_length_check
check (
  char_length(contact_instagram) <= 100
  and char_length(contact_facebook) <= 100
  and char_length(contact_phone) <= 100
  and char_length(contact_line) <= 100
);

-- Removed: these exposed whole profiles rows (including email) to any signed-in
-- user. With open sign-up anyone can be "authenticated", so public tutor data is
-- served only through public_tutor_cards (below).
drop policy if exists "Authenticated users can view public tutor cards" on public.tutor_profiles;
drop policy if exists "Authenticated users can view public tutor profiles" on public.profiles;

-- Users may not make themselves admin (on insert or update) or demote an admin
-- through the API. Only the service role (server-side admin tooling) can.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'role change not allowed';
    end if;
  elsif old.role is distinct from new.role and (old.role = 'admin' or new.role = 'admin') then
    raise exception 'role change not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
before insert or update of role on public.profiles
for each row
execute function public.guard_profile_role();

-- Create the app rows for every new auth user from sign-up metadata.
-- Only 'student' or 'tutor' are accepted; anything else becomes 'student'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role text := case when new.raw_user_meta_data->>'role' = 'tutor' then 'tutor' else 'student' end;
  signup_name text := coalesce(btrim(new.raw_user_meta_data->>'display_name'), '');
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, coalesce(new.email, ''), signup_name, signup_role)
  on conflict (id) do nothing;

  if signup_role = 'tutor' then
    insert into public.user_settings (id, profile_visibility)
    values (new.id, 'public')
    on conflict (id) do nothing;

    insert into public.tutor_profiles (id)
    values (new.id)
    on conflict (id) do nothing;
  else
    insert into public.user_settings (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- The only public window onto tutors: safe columns, no email.
-- Deliberately NOT security_invoker: it runs with the owner's rights so anon can
-- read it without any anon policy on profiles / user_settings / tutor_profiles.
-- Listing rule mirrors src/lib/tutor-visibility.ts (missingTutorFields).
-- Dropped and recreated (not "create or replace") because columns change;
-- get_tutor_contacts depends on the view, so it is dropped first and recreated below.
drop function if exists public.get_tutor_contacts(uuid);
drop view if exists public.public_tutor_cards;

create view public.public_tutor_cards as
select
  p.id,
  p.display_name,
  t.headline,
  t.about,
  p.preferred_subjects as subjects,
  t.teaching_levels,
  t.teaching_modes,
  t.hourly_rate_min,
  t.hourly_rate_max,
  t.years_experience,
  p.bio
from public.profiles p
join public.tutor_profiles t on t.id = p.id
left join public.user_settings s on s.id = p.id
where p.role = 'tutor'
  and btrim(coalesce(p.display_name, '')) <> ''
  and t.hourly_rate_min >= 250
  and t.hourly_rate_max >= t.hourly_rate_min
  and cardinality(p.preferred_subjects) > 0
  and cardinality(t.teaching_levels) > 0
  and (t.contact_instagram <> '' or t.contact_facebook <> '' or t.contact_phone <> '' or t.contact_line <> '')
  and coalesce(s.profile_visibility, 'public') <> 'private';

revoke all on public.public_tutor_cards from public, anon, authenticated;
grant select on public.public_tutor_cards to anon, authenticated;

-- Contact details for one listed tutor, for signed-in users only.
-- security definer: callers have no direct read access to tutor_profiles.
create or replace function public.get_tutor_contacts(tutor uuid)
returns table (instagram text, facebook text, phone text, line text)
language sql
stable
security definer
set search_path = public
as $$
  select t.contact_instagram, t.contact_facebook, t.contact_phone, t.contact_line
  from public.tutor_profiles t
  where t.id = tutor
    and auth.uid() is not null
    and exists (select 1 from public.public_tutor_cards c where c.id = tutor);
$$;

revoke all on function public.get_tutor_contacts(uuid) from public, anon;
grant execute on function public.get_tutor_contacts(uuid) to authenticated;

-- Subject taxonomy
create table if not exists public.subjects (
  id bigserial primary key,
  slug text not null unique,
  name text not null unique,
  category text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.subjects enable row level security;

drop policy if exists "Authenticated users can view subjects" on public.subjects;
create policy "Authenticated users can view subjects"
on public.subjects
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create subjects" on public.subjects;
create policy "Authenticated users can create subjects"
on public.subjects
for insert
to authenticated
with check (true);

-- Tutor <-> subject normalized relation
create table if not exists public.tutor_subjects (
  tutor_user_id uuid not null references public.tutor_profiles (id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  proficiency text check (proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (tutor_user_id, subject_id)
);

alter table public.tutor_subjects enable row level security;

drop policy if exists "Tutors can manage own tutor subjects" on public.tutor_subjects;
create policy "Tutors can manage own tutor subjects"
on public.tutor_subjects
for all
to authenticated
using ((select auth.uid()) = tutor_user_id)
with check ((select auth.uid()) = tutor_user_id);

drop policy if exists "Authenticated users can view public tutor subjects" on public.tutor_subjects;
create policy "Authenticated users can view public tutor subjects"
on public.tutor_subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.user_settings us
    where us.id = tutor_subjects.tutor_user_id
      and us.profile_visibility = 'public'
  )
);

-- Student <-> subject interest normalized relation
create table if not exists public.student_subject_interests (
  student_user_id uuid not null references public.student_profiles (user_id) on delete cascade,
  subject_id bigint not null references public.subjects (id) on delete cascade,
  priority smallint,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (student_user_id, subject_id)
);

alter table public.student_subject_interests enable row level security;

drop policy if exists "Students can manage own subject interests" on public.student_subject_interests;
create policy "Students can manage own subject interests"
on public.student_subject_interests
for all
to authenticated
using ((select auth.uid()) = student_user_id)
with check ((select auth.uid()) = student_user_id);

-- Tutor teaching modes normalized relation
create table if not exists public.tutor_teaching_modes (
  tutor_user_id uuid not null references public.tutor_profiles (id) on delete cascade,
  mode text not null check (mode in ('online', 'in_person', 'group', 'hybrid')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (tutor_user_id, mode)
);

alter table public.tutor_teaching_modes enable row level security;

drop policy if exists "Tutors can manage own teaching modes" on public.tutor_teaching_modes;
create policy "Tutors can manage own teaching modes"
on public.tutor_teaching_modes
for all
to authenticated
using ((select auth.uid()) = tutor_user_id)
with check ((select auth.uid()) = tutor_user_id);

drop policy if exists "Authenticated users can view public teaching modes" on public.tutor_teaching_modes;
create policy "Authenticated users can view public teaching modes"
on public.tutor_teaching_modes
for select
to authenticated
using (
  exists (
    select 1
    from public.user_settings us
    where us.id = tutor_teaching_modes.tutor_user_id
      and us.profile_visibility = 'public'
  )
);

-- Core transactional flow: students or guests request tutors
create table if not exists public.tutor_requests (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid references public.profiles (id) on delete set null,
  guest_name text,
  guest_email text,
  tutor_user_id uuid not null references public.tutor_profiles (id) on delete cascade,
  subject_id bigint references public.subjects (id) on delete set null,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  requested_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tutor_requests_requester_check check (
    student_user_id is not null
    or (guest_name is not null and guest_email is not null)
  )
);

drop trigger if exists set_tutor_requests_updated_at on public.tutor_requests;
create trigger set_tutor_requests_updated_at
before update on public.tutor_requests
for each row
execute function public.set_updated_at();

alter table public.tutor_requests enable row level security;

drop policy if exists "Students can view own tutor requests" on public.tutor_requests;
create policy "Students can view own tutor requests"
on public.tutor_requests
for select
to authenticated
using ((select auth.uid()) = student_user_id);

drop policy if exists "Tutors can view requests sent to them" on public.tutor_requests;
create policy "Tutors can view requests sent to them"
on public.tutor_requests
for select
to authenticated
using ((select auth.uid()) = tutor_user_id);

drop policy if exists "Students can create own tutor requests" on public.tutor_requests;
create policy "Students can create own tutor requests"
on public.tutor_requests
for insert
to authenticated
with check ((select auth.uid()) = student_user_id);

drop policy if exists "Tutors can update requests sent to them" on public.tutor_requests;
create policy "Tutors can update requests sent to them"
on public.tutor_requests
for update
to authenticated
using ((select auth.uid()) = tutor_user_id)
with check ((select auth.uid()) = tutor_user_id);

-- Match created from accepted request
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tutor_request_id uuid not null unique references public.tutor_requests (id) on delete cascade,
  student_user_id uuid references public.profiles (id) on delete set null,
  tutor_user_id uuid not null references public.tutor_profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

alter table public.matches enable row level security;

drop policy if exists "Students can view own matches" on public.matches;
create policy "Students can view own matches"
on public.matches
for select
to authenticated
using ((select auth.uid()) = student_user_id);

drop policy if exists "Tutors can view own matches" on public.matches;
create policy "Tutors can view own matches"
on public.matches
for select
to authenticated
using ((select auth.uid()) = tutor_user_id);

-- Optional session scheduling layer
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_sessions_updated_at on public.sessions;
create trigger set_sessions_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

alter table public.sessions enable row level security;

drop policy if exists "Matched users can view sessions" on public.sessions;
create policy "Matched users can view sessions"
on public.sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = sessions.match_id
      and ((select auth.uid()) = m.student_user_id or (select auth.uid()) = m.tutor_user_id)
  )
);

-- Optional document ownership layer
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  storage_path text not null,
  title text not null,
  visibility text not null default 'private' check (visibility in ('private', 'match_only', 'shared')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

alter table public.documents enable row level security;

drop policy if exists "Owners can manage own documents" on public.documents;
create policy "Owners can manage own documents"
on public.documents
for all
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "Matched users can view shared documents" on public.documents;
create policy "Matched users can view shared documents"
on public.documents
for select
to authenticated
using (
  visibility = 'shared'
  or (
    visibility = 'match_only'
    and exists (
      select 1
      from public.matches m
      where m.id = documents.match_id
        and ((select auth.uid()) = m.student_user_id or (select auth.uid()) = m.tutor_user_id)
    )
  )
);

-- Seed starter subjects only if empty
insert into public.subjects (slug, name, category)
select *
from (
  values
    ('mathematics', 'Mathematics', 'Academic'),
    ('physics', 'Physics', 'Academic'),
    ('chemistry', 'Chemistry', 'Academic'),
    ('biology', 'Biology', 'Academic'),
    ('english', 'English', 'Language'),
    ('computer-science', 'Computer Science', 'Technology'),
    ('sat-prep', 'SAT Prep', 'Exam Prep')
) as seed(slug, name, category)
where not exists (select 1 from public.subjects);

-- ---------------------------------------------------------------------------
-- Request board: students post what they need, listed tutors send one offer
-- (a single hourly price) per post. All writes go through the functions below;
-- the tables have read-only RLS. No budget field by design (avoids a price norm).
-- ---------------------------------------------------------------------------

create table if not exists public.student_requests (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.profiles (id) on delete cascade,
  subjects text[] not null,
  teaching_levels text[] not null,
  teaching_modes text[] not null,
  details text not null default '',
  schedule text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint student_requests_fields_check check (
    cardinality(subjects) > 0
    and cardinality(teaching_levels) > 0
    and cardinality(teaching_modes) > 0
    and teaching_levels <@ array['primary', 'lower_secondary', 'upper_secondary', 'university', 'adult']::text[]
    and teaching_modes <@ array['online', 'in_person', 'group', 'hybrid']::text[]
    and char_length(btrim(schedule)) between 1 and 200
    and char_length(details) <= 1000
  )
);

create index if not exists student_requests_student_idx on public.student_requests (student_user_id);

drop trigger if exists set_student_requests_updated_at on public.student_requests;
create trigger set_student_requests_updated_at
before update on public.student_requests
for each row
execute function public.set_updated_at();

create table if not exists public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.student_requests (id) on delete cascade,
  tutor_user_id uuid not null references public.tutor_profiles (id) on delete cascade,
  hourly_rate integer not null check (hourly_rate >= 250),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'deal_done', 'closed', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (request_id, tutor_user_id)
);

create index if not exists request_offers_request_idx on public.request_offers (request_id);
create index if not exists request_offers_tutor_idx on public.request_offers (tutor_user_id);

drop trigger if exists set_request_offers_updated_at on public.request_offers;
create trigger set_request_offers_updated_at
before update on public.request_offers
for each row
execute function public.set_updated_at();

-- RLS helpers. The two tables' policies refer to each other; going through
-- security definer functions avoids infinite policy recursion.
create or replace function public.is_request_owner(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.student_requests r where r.id = p_request and r.student_user_id = auth.uid());
$$;

create or replace function public.has_offer_on(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.request_offers o where o.request_id = p_request and o.tutor_user_id = auth.uid());
$$;

alter table public.student_requests enable row level security;
alter table public.request_offers enable row level security;

drop policy if exists "Students can view own requests" on public.student_requests;
create policy "Students can view own requests"
on public.student_requests for select to authenticated
using ((select auth.uid()) = student_user_id);

drop policy if exists "Tutors can view requests they offered on" on public.student_requests;
create policy "Tutors can view requests they offered on"
on public.student_requests for select to authenticated
using (public.has_offer_on(id));

drop policy if exists "Tutors can view own offers" on public.request_offers;
create policy "Tutors can view own offers"
on public.request_offers for select to authenticated
using ((select auth.uid()) = tutor_user_id);

drop policy if exists "Students can view offers on own requests" on public.request_offers;
create policy "Students can view offers on own requests"
on public.request_offers for select to authenticated
using (public.is_request_owner(request_id));

-- Public board: open posts only, nothing that identifies the student, and only
-- the number of offers (never their prices). Runs with owner rights, like public_tutor_cards.
create or replace view public.public_request_cards as
select
  r.id,
  r.subjects,
  r.teaching_levels,
  r.teaching_modes,
  r.details,
  r.schedule,
  r.created_at,
  (
    select count(*)::int
    from public.request_offers o
    where o.request_id = r.id and o.status in ('pending', 'accepted')
  ) as offer_count
from public.student_requests r
where r.status = 'open';

revoke all on public.public_request_cards from public, anon, authenticated;
grant select on public.public_request_cards to anon, authenticated;

create or replace function public.create_request(
  p_subjects text[],
  p_teaching_levels text[],
  p_details text,
  p_schedule text,
  p_teaching_modes text[]
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.profiles where id = uid and role = 'student') then
    raise exception 'Only students can post requests';
  end if;
  if not exists (
    select 1 from public.student_profiles sp
    where sp.user_id = uid
      and (sp.contact_instagram <> '' or sp.contact_facebook <> '' or sp.contact_phone <> '' or sp.contact_line <> '')
  ) then
    raise exception 'Add at least one contact channel before posting';
  end if;
  if exists (select 1 from unnest(p_subjects) s where s not in (select name from public.subjects)) then
    raise exception 'Unknown subject';
  end if;

  insert into public.student_requests (student_user_id, subjects, teaching_levels, teaching_modes, details, schedule)
  values (uid, p_subjects, p_teaching_levels, p_teaching_modes, btrim(coalesce(p_details, '')), btrim(coalesce(p_schedule, '')))
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.cancel_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.student_requests
  set status = 'cancelled'
  where id = p_request and student_user_id = auth.uid() and status = 'open';
  if not found then
    raise exception 'Request is no longer open';
  end if;

  update public.request_offers
  set status = 'closed'
  where request_id = p_request and status in ('pending', 'accepted');
end;
$$;

create or replace function public.submit_offer(p_request uuid, p_rate integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  req record;
  existing record;
  offer_id uuid;
begin
  if uid is null or not exists (select 1 from public.public_tutor_cards c where c.id = uid) then
    raise exception 'Finish your tutor profile to send offers';
  end if;
  if p_rate is null or p_rate < 250 then
    raise exception 'The minimum rate is 250 THB/hr';
  end if;

  select student_user_id, status into req from public.student_requests where id = p_request for update;
  if not found or req.status <> 'open' then
    raise exception 'This request is no longer open';
  end if;
  if req.student_user_id = uid then
    raise exception 'You cannot make an offer on your own request';
  end if;

  select id, status into existing
  from public.request_offers
  where request_id = p_request and tutor_user_id = uid
  for update;

  if not found then
    insert into public.request_offers (request_id, tutor_user_id, hourly_rate)
    values (p_request, uid, p_rate)
    returning id into offer_id;
    return offer_id;
  end if;

  if existing.status in ('pending', 'withdrawn') then
    update public.request_offers set hourly_rate = p_rate, status = 'pending' where id = existing.id;
    return existing.id;
  end if;

  raise exception 'You already have an offer on this request';
end;
$$;

create or replace function public.withdraw_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.request_offers
  set status = 'withdrawn'
  where id = p_offer and tutor_user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Offer is no longer pending';
  end if;
end;
$$;

create or replace function public.accept_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o record;
begin
  select ro.request_id, ro.tutor_user_id, r.student_user_id
  into o
  from public.request_offers ro
  join public.student_requests r on r.id = ro.request_id
  where ro.id = p_offer;

  if not found or o.student_user_id <> auth.uid() then
    raise exception 'Offer not found';
  end if;
  if not exists (select 1 from public.public_tutor_cards c where c.id = o.tutor_user_id) then
    raise exception 'This tutor is no longer available';
  end if;

  perform 1 from public.student_requests where id = o.request_id and status = 'open' for update;
  if not found then
    raise exception 'Request is no longer open';
  end if;

  update public.request_offers set status = 'accepted' where id = p_offer and status = 'pending';
  if not found then
    raise exception 'Offer is no longer pending';
  end if;
end;
$$;

create or replace function public.decline_offer(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.request_offers ro
  set status = 'declined'
  where ro.id = p_offer
    and ro.status in ('pending', 'accepted')
    and public.is_request_owner(ro.request_id);
  if not found then
    raise exception 'Offer can no longer be declined';
  end if;
end;
$$;

create or replace function public.confirm_deal(p_offer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o record;
begin
  select ro.request_id, ro.tutor_user_id, r.student_user_id
  into o
  from public.request_offers ro
  join public.student_requests r on r.id = ro.request_id
  where ro.id = p_offer;

  if not found or auth.uid() not in (o.student_user_id, o.tutor_user_id) then
    raise exception 'Offer not found';
  end if;

  -- Lock the request so two deals on the same post cannot both succeed.
  perform 1 from public.student_requests where id = o.request_id and status = 'open' for update;
  if not found then
    raise exception 'Request is no longer open';
  end if;

  update public.request_offers set status = 'deal_done' where id = p_offer and status = 'accepted';
  if not found then
    raise exception 'Offer is no longer accepted';
  end if;

  update public.student_requests set status = 'closed' where id = o.request_id;
  update public.request_offers
  set status = 'closed'
  where request_id = o.request_id and id <> p_offer and status in ('pending', 'accepted');
end;
$$;

-- The other party of an accepted offer: the tutor (for the student) or the
-- student (for the tutor), with their contact channels. Nothing before accept.
create or replace function public.get_offer_counterpart(p_offer uuid)
returns table (display_name text, instagram text, facebook text, phone text, line text)
language sql stable security definer set search_path = public as $$
  select coalesce(p.display_name, ''), t.contact_instagram, t.contact_facebook, t.contact_phone, t.contact_line
  from public.request_offers o
  join public.student_requests r on r.id = o.request_id
  join public.profiles p on p.id = o.tutor_user_id
  join public.tutor_profiles t on t.id = o.tutor_user_id
  where o.id = p_offer and o.status in ('accepted', 'deal_done') and r.student_user_id = auth.uid()
  union all
  select coalesce(p.display_name, ''),
    coalesce(sp.contact_instagram, ''), coalesce(sp.contact_facebook, ''),
    coalesce(sp.contact_phone, ''), coalesce(sp.contact_line, '')
  from public.request_offers o
  join public.student_requests r on r.id = o.request_id
  join public.profiles p on p.id = r.student_user_id
  left join public.student_profiles sp on sp.user_id = r.student_user_id
  where o.id = p_offer and o.status in ('accepted', 'deal_done') and o.tutor_user_id = auth.uid();
$$;

-- Numbers for the nav badges.
create or replace function public.my_attention_counts()
returns table (pending_offers int, accepted_offers int)
language sql stable security definer set search_path = public as $$
  select
    (
      select count(*)::int
      from public.request_offers o
      join public.student_requests r on r.id = o.request_id
      where r.student_user_id = auth.uid() and r.status = 'open' and o.status = 'pending'
    ),
    (
      select count(*)::int
      from public.request_offers o
      where o.tutor_user_id = auth.uid() and o.status = 'accepted'
    );
$$;

revoke all on function public.is_request_owner(uuid) from public, anon;
revoke all on function public.has_offer_on(uuid) from public, anon;
revoke all on function public.create_request(text[], text[], text, text, text[]) from public, anon;
revoke all on function public.cancel_request(uuid) from public, anon;
revoke all on function public.submit_offer(uuid, integer) from public, anon;
revoke all on function public.withdraw_offer(uuid) from public, anon;
revoke all on function public.accept_offer(uuid) from public, anon;
revoke all on function public.decline_offer(uuid) from public, anon;
revoke all on function public.confirm_deal(uuid) from public, anon;
revoke all on function public.get_offer_counterpart(uuid) from public, anon;
revoke all on function public.my_attention_counts() from public, anon;

grant execute on function public.is_request_owner(uuid) to authenticated;
grant execute on function public.has_offer_on(uuid) to authenticated;
grant execute on function public.create_request(text[], text[], text, text, text[]) to authenticated;
grant execute on function public.cancel_request(uuid) to authenticated;
grant execute on function public.submit_offer(uuid, integer) to authenticated;
grant execute on function public.withdraw_offer(uuid) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid) to authenticated;
grant execute on function public.confirm_deal(uuid) to authenticated;
grant execute on function public.get_offer_counterpart(uuid) to authenticated;
grant execute on function public.my_attention_counts() to authenticated;
