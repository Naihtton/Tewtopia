import { getSessionUser } from '@/lib/auth';
import { EMPTY_CONTACT_DETAILS, normalizeContactDetails, type ContactDetails } from '@/lib/contact';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'student' | 'tutor';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  // Public URL in the avatars bucket, or null.
  avatarUrl: string | null;
  role: UserRole;
  preferredSubjects: string[];
  bio: string;
  status: 'profile_incomplete' | 'profile_ready';
  updatedAt: string | null;
  // Student contact channels (student_profiles). Empty for tutors.
  contacts: ContactDetails;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
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
    avatarUrl: null,
    role: 'student',
    preferredSubjects: [],
    bio: '',
    status: 'profile_incomplete',
    updatedAt: null,
    contacts: EMPTY_CONTACT_DETAILS,
  };
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? '',
    avatarUrl: row.avatar_url,
    role: row.role ?? 'student',
    preferredSubjects: row.preferred_subjects ?? [],
    bio: row.bio ?? '',
    status: row.status ?? 'profile_incomplete',
    updatedAt: row.updated_at,
    contacts: EMPTY_CONTACT_DETAILS,
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
    .select('id, email, display_name, avatar_url, role, preferred_subjects, bio, status, updated_at')
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

  const profile = mapProfileRow(data);

  if (profile.role === 'student') {
    const { data: student } = await supabase
      .from('student_profiles')
      .select('contact_instagram, contact_facebook, contact_phone, contact_line')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (student) {
      profile.contacts = normalizeContactDetails({
        instagram: student.contact_instagram,
        facebook: student.contact_facebook,
        phone: student.contact_phone,
        line: student.contact_line,
      });
    }
  }

  return {
    profile,
    error: null,
  };
}
