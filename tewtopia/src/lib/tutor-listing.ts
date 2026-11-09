import type { UserProfile } from '@/lib/profiles';
import { getCurrentUserSettings } from '@/lib/settings';
import { hasAnyContact } from '@/lib/tutor-contact';
import { getCurrentTutorProfile } from '@/lib/tutor-profiles';
import { tutorSetupChecklist } from '@/lib/tutor-visibility';

export type TutorChecklist = ReturnType<typeof tutorSetupChecklist>;

/**
 * The signed-in tutor's "Get listed on Find tutors" checklist, from saved data.
 * Shared by the dashboard and the profile page so both say the same thing.
 */
export async function getCurrentTutorChecklist(profile: UserProfile): Promise<TutorChecklist> {
  const [tutorResult, settingsResult] = await Promise.all([getCurrentTutorProfile(), getCurrentUserSettings()]);
  const tutorProfile = tutorResult?.tutorProfile;

  return tutorSetupChecklist({
    displayName: profile.displayName,
    subjects: profile.preferredSubjects,
    rateMin: tutorProfile?.rateMin ?? null,
    rateMax: tutorProfile?.rateMax ?? null,
    teachingLevels: tutorProfile?.teachingLevels ?? [],
    hasContact: tutorProfile ? hasAnyContact(tutorProfile.contacts) : false,
    visibility: settingsResult?.settings.profileVisibility ?? null,
  });
}
