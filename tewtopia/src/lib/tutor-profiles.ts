import { getCurrentUserProfile, type UserProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';
import { normalizeTeachingLevels, type TeachingLevel } from '@/lib/tutor-visibility';

export type TutorProfile = {
  id: string;
  headline: string;
  hourlyRate: number | null;
  yearsExperience: number | null;
  teachingModes: string[];
  teachingLevels: TeachingLevel[];
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
  about: string | null;
  updated_at: string | null;
};

export type BrowseTutorCard = {
  id: string;
  displayName: string;
  headline: string;
  about: string;
  preferredSubjects: string[];
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
    .select('id, headline, hourly_rate, years_experience, teaching_modes, teaching_levels, about, updated_at')
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

export async function listVisibleTutorsForStudents() {
  const supabase = await createClient();

  const { data: publicSettingsRows, error: settingsError } = await supabase
    .from('user_settings')
    .select('id')
    .eq('profile_visibility', 'public');

  if (settingsError) {
    return {
      tutors: [] as BrowseTutorCard[],
      error: settingsError.message,
    };
  }

  const visibleIds = publicSettingsRows.map((row) => row.id);

  if (visibleIds.length === 0) {
    return {
      tutors: [] as BrowseTutorCard[],
      error: null,
    };
  }

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, preferred_subjects, bio')
    .eq('role', 'tutor')
    .in('id', visibleIds);

  if (profileError) {
    return {
      tutors: [] as BrowseTutorCard[],
      error: profileError.message,
    };
  }

  const profileMap = new Map(
    profileRows.map((row) => [
      row.id,
      {
        displayName: row.display_name ?? 'Unnamed tutor',
        preferredSubjects: row.preferred_subjects ?? [],
        bio: row.bio ?? '',
      },
    ]),
  );

  const tutorIds = Array.from(profileMap.keys());

  if (tutorIds.length === 0) {
    return {
      tutors: [] as BrowseTutorCard[],
      error: null,
    };
  }

  const { data: tutorRows, error: tutorError } = await supabase
    .from('tutor_profiles')
    .select('id, headline, hourly_rate, years_experience, teaching_modes, about')
    .in('id', tutorIds);

  if (tutorError) {
    return {
      tutors: [] as BrowseTutorCard[],
      error: tutorError.message,
    };
  }

  const tutors: BrowseTutorCard[] = tutorRows
    .map((row) => {
      const profile = profileMap.get(row.id);

      if (!profile) {
        return null;
      }

      return {
        id: row.id,
        displayName: profile.displayName,
        // Columns are `not null default ''`, so fall back on empty strings, not just null.
        headline: row.headline || 'Tutor profile in progress',
        about: row.about || profile.bio,
        preferredSubjects: profile.preferredSubjects,
        teachingModes: row.teaching_modes ?? [],
        hourlyRate: row.hourly_rate,
        yearsExperience: row.years_experience,
      };
    })
    .filter((tutor): tutor is BrowseTutorCard => Boolean(tutor));

  return {
    tutors,
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
