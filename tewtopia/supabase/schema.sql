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
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own roles" on public.user_roles;
create policy "Users can update own roles"
on public.user_roles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

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

drop policy if exists "Authenticated users can view public settings rows" on public.user_settings;
create policy "Authenticated users can view public settings rows"
on public.user_settings
for select
to authenticated
using (profile_visibility = 'public');

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

drop policy if exists "Authenticated users can view public tutor cards" on public.tutor_profiles;
create policy "Authenticated users can view public tutor cards"
on public.tutor_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.user_settings us
    where us.id = tutor_profiles.id
      and us.profile_visibility = 'public'
  )
);

drop policy if exists "Authenticated users can view public tutor profiles" on public.profiles;
create policy "Authenticated users can view public tutor profiles"
on public.profiles
for select
to authenticated
using (
  role = 'tutor'
  and exists (
    select 1
    from public.user_settings us
    where us.id = profiles.id
      and us.profile_visibility = 'public'
  )
);

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
