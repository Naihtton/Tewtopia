import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/profiles';

type DatabaseClient = SupabaseClient;

type SubjectRow = {
  id: number;
  slug: string;
};

const teachingModeAliases: Record<string, 'online' | 'in_person' | 'group' | 'hybrid'> = {
  online: 'online',
  remote: 'online',
  virtual: 'online',
  zoom: 'online',
  'in person': 'in_person',
  inperson: 'in_person',
  onsite: 'in_person',
  offline: 'in_person',
  'face to face': 'in_person',
  group: 'group',
  'group class': 'group',
  class: 'group',
  hybrid: 'hybrid',
  blended: 'hybrid',
};

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function parseCommaSeparatedList(value: unknown) {
  if (typeof value !== 'string') {
    return [];
  }

  return dedupe(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function slugifySubject(subject: string) {
  return subject
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatSubjectName(subject: string) {
  const trimmed = subject.trim();

  if (trimmed.length <= 4 && /^[a-z]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeTeachingModes(values: string[]) {
  return dedupe(
    values
      .map((value) => value.trim().toLowerCase())
      .map((value) => teachingModeAliases[value] ?? null)
      .filter((value): value is 'online' | 'in_person' | 'group' | 'hybrid' => Boolean(value)),
  );
}

async function ensureSubjects(supabase: DatabaseClient, subjects: string[]) {
  const subjectInputs = dedupe(subjects)
    .map((subject) => ({
      slug: slugifySubject(subject),
      name: formatSubjectName(subject),
    }))
    .filter((subject) => subject.slug.length > 0);

  if (subjectInputs.length === 0) {
    return [] as SubjectRow[];
  }

  const { error: upsertError } = await supabase.from('subjects').upsert(subjectInputs, {
    onConflict: 'slug',
    // `subjects` only grants select/insert under RLS, so existing slugs must be skipped, not updated.
    ignoreDuplicates: true,
  });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { data, error } = await supabase
    .from('subjects')
    .select('id, slug')
    .in(
      'slug',
      subjectInputs.map((subject) => subject.slug),
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SubjectRow[];
}

export async function syncUserRole(supabase: DatabaseClient, userId: string, role: UserRole) {
  const { error } = await supabase.from('user_roles').upsert(
    {
      user_id: userId,
      role,
    },
    { onConflict: 'user_id,role' },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureStudentProfileRow(supabase: DatabaseClient, userId: string) {
  const { error } = await supabase.from('student_profiles').upsert(
    {
      user_id: userId,
    },
    { onConflict: 'user_id', ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureTutorProfileRow(supabase: DatabaseClient, userId: string) {
  const { error } = await supabase.from('tutor_profiles').upsert(
    {
      id: userId,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncRoleSubjects(
  supabase: DatabaseClient,
  userId: string,
  role: UserRole,
  preferredSubjects: string[],
) {
  const subjectRows = await ensureSubjects(supabase, preferredSubjects);

  if (role === 'tutor') {
    // tutor_subjects references tutor_profiles, which a user who just switched to tutor doesn't have yet.
    await ensureTutorProfileRow(supabase, userId);

    const { error: deleteStudentInterestError } = await supabase
      .from('student_subject_interests')
      .delete()
      .eq('student_user_id', userId);

    if (deleteStudentInterestError) {
      throw new Error(deleteStudentInterestError.message);
    }

    const { error: deleteTutorSubjectError } = await supabase
      .from('tutor_subjects')
      .delete()
      .eq('tutor_user_id', userId);

    if (deleteTutorSubjectError) {
      throw new Error(deleteTutorSubjectError.message);
    }

    if (subjectRows.length === 0) {
      return;
    }

    const { error: insertTutorSubjectError } = await supabase.from('tutor_subjects').insert(
      subjectRows.map((subject) => ({
        tutor_user_id: userId,
        subject_id: subject.id,
      })),
    );

    if (insertTutorSubjectError) {
      throw new Error(insertTutorSubjectError.message);
    }

    return;
  }

  await ensureStudentProfileRow(supabase, userId);

  const { error: deleteTutorSubjectError } = await supabase
    .from('tutor_subjects')
    .delete()
    .eq('tutor_user_id', userId);

  if (deleteTutorSubjectError) {
    throw new Error(deleteTutorSubjectError.message);
  }

  const { error: deleteStudentInterestError } = await supabase
    .from('student_subject_interests')
    .delete()
    .eq('student_user_id', userId);

  if (deleteStudentInterestError) {
    throw new Error(deleteStudentInterestError.message);
  }

  if (subjectRows.length === 0) {
    return;
  }

  const { error: insertStudentInterestError } = await supabase.from('student_subject_interests').insert(
    subjectRows.map((subject, index) => ({
      student_user_id: userId,
      subject_id: subject.id,
      priority: index + 1,
    })),
  );

  if (insertStudentInterestError) {
    throw new Error(insertStudentInterestError.message);
  }
}

export async function syncTutorTeachingModes(supabase: DatabaseClient, userId: string, teachingModes: string[]) {
  const normalizedModes = normalizeTeachingModes(teachingModes);

  const { error: deleteError } = await supabase
    .from('tutor_teaching_modes')
    .delete()
    .eq('tutor_user_id', userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (normalizedModes.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('tutor_teaching_modes').insert(
    normalizedModes.map((mode) => ({
      tutor_user_id: userId,
      mode,
    })),
  );

  if (insertError) {
    throw new Error(insertError.message);
  }
}
