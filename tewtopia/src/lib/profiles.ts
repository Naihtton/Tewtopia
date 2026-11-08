import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'student' | 'tutor';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  preferredSubjects: string[];
  bio: string;
  status: 'profile_incomplete' | 'profile_ready';
  updatedAt: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole | null;
  preferred_subjects: string[] | null;
  bio: string | null;
  status: UserProfile['status'] | null;
  updated_at: string | null;
};

function buildDefaultProfile(user: { id: string; email: string }): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: '',
    role: 'student',
    preferredSubjects: [],
    bio: '',
    status: 'profile_incomplete',
    updatedAt: null,
  };
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? '',
    role: row.role ?? 'student',
    preferredSubjects: row.preferred_subjects ?? [],
    bio: row.bio ?? '',
    status: row.status ?? 'profile_incomplete',
    updatedAt: row.updated_at,
  };
}

export async function getCurrentUserProfile() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, preferred_subjects, bio, status, updated_at')
    .eq('id', sessionUser.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    return {
      profile: buildDefaultProfile(sessionUser),
      error: error.message,
    };
  }

  if (!data) {
    return {
      profile: buildDefaultProfile(sessionUser),
      error: null,
    };
  }

  return {
    profile: mapProfileRow(data),
    error: null,
  };
}
