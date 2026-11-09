import { getCurrentUserProfile, type UserProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';
import { EMPTY_CONTACT_DETAILS, normalizeContactDetails, type ContactDetails } from '@/lib/tutor-contact';
import { normalizeTeachingLevels, type TeachingLevel } from '@/lib/tutor-visibility';

export type TutorProfile = {
  id: string;
  headline: string;
  hourlyRate: number | null;
  yearsExperience: number | null;
  teachingModes: string[];
  teachingLevels: TeachingLevel[];
  contacts: ContactDetails;
  about: string;
  updatedAt: string | null;
};

type TutorProfileRow = {
  id: string;
  headline: string | null;
  hourly_rate: number | null;
  years_experience: number | null;
  teaching_modes: string[] | null;
  teaching_levels: string[] | null;
  contact_instagram: string | null;
  contact_facebook: string | null;
  contact_phone: string | null;
  contact_line: string | null;
  about: string | null;
  updated_at: string | null;
};

export type BrowseTutorCard = {
  id: string;
  displayName: string;
  headline: string;
  about: string;
  preferredSubjects: string[];
  teachingLevels: string[];
  teachingModes: string[];
  hourlyRate: number | null;
  yearsExperience: number | null;
};

function buildDefaultTutorProfile(userId: string): TutorProfile {
  return {
    id: userId,
    headline: '',
    hourlyRate: null,
    yearsExperience: null,
    teachingModes: [],
    teachingLevels: [],
    contacts: EMPTY_CONTACT_DETAILS,
    about: '',
    updatedAt: null,
  };
}

function mapTutorProfileRow(row: TutorProfileRow): TutorProfile {
  return {
    id: row.id,
    headline: row.headline ?? '',
    hourlyRate: row.hourly_rate,
    yearsExperience: row.years_experience,
    teachingModes: row.teaching_modes ?? [],
    teachingLevels: normalizeTeachingLevels(row.teaching_levels),
    contacts: normalizeContactDetails({
      instagram: row.contact_instagram,
      facebook: row.contact_facebook,
      phone: row.contact_phone,
      line: row.contact_line,
    }),
    about: row.about ?? '',
    updatedAt: row.updated_at,
  };
}

export async function getCurrentTutorProfile() {
  const profileResult = await getCurrentUserProfile();

  if (!profileResult) {
    return null;
  }

  if (profileResult.profile.role !== 'tutor') {
    return {
      profile: profileResult.profile,
      tutorProfile: null,
      error: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .select('id, headline, hourly_rate, years_experience, teaching_modes, teaching_levels, contact_instagram, contact_facebook, contact_phone, contact_line, about, updated_at')
    .eq('id', profileResult.profile.id)
    .maybeSingle<TutorProfileRow>();

  if (error) {
    return {
      profile: profileResult.profile,
      tutorProfile: buildDefaultTutorProfile(profileResult.profile.id),
      error: error.message,
    };
  }

  return {
    profile: profileResult.profile,
    tutorProfile: data ? mapTutorProfileRow(data) : buildDefaultTutorProfile(profileResult.profile.id),
    error: null,
  };
}

type PublicTutorCardRow = {
  id: string;
  display_name: string | null;
  headline: string | null;
  about: string | null;
  subjects: string[] | null;
  teaching_levels: string[] | null;
  teaching_modes: string[] | null;
  hourly_rate: number | null;
  years_experience: number | null;
  bio: string | null;
};

// Reads only the public_tutor_cards view (no email). Works for guests and signed-in users.
export async function listPublicTutorCards(): Promise<{ tutors: BrowseTutorCard[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('public_tutor_cards')
    .select(
      'id, display_name, headline, about, subjects, teaching_levels, teaching_modes, hourly_rate, years_experience, bio',
    )
    .order('display_name')
    .returns<PublicTutorCardRow[]>();

  if (error) {
    // Public page: log the details server-side, show visitors a plain message.
    console.error('listPublicTutorCards failed:', error.message);
    return { tutors: [], error: "We couldn't load tutors right now. Please try again shortly." };
  }

  return {
    tutors: (data ?? []).map((row) => ({
      id: row.id,
      displayName: row.display_name ?? '',
      headline: row.headline || 'Tutor',
      about: row.about || row.bio || '',
      preferredSubjects: row.subjects ?? [],
      teachingLevels: row.teaching_levels ?? [],
      teachingModes: row.teaching_modes ?? [],
      hourlyRate: row.hourly_rate,
      yearsExperience: row.years_experience,
    })),
    error: null,
  };
}

export function getTutorProfileChecklist(profile: UserProfile, tutorProfile: TutorProfile) {
  return [
    { label: 'Set public display name', done: profile.displayName.trim().length > 0 },
    { label: 'Choose teaching subjects', done: profile.preferredSubjects.length > 0 },
    { label: 'Write tutor headline', done: tutorProfile.headline.trim().length > 0 },
    { label: 'Add tutor description', done: tutorProfile.about.trim().length > 0 },
    { label: 'Set profile visibility to public', done: profile.status === 'profile_ready' },
  ];
}
