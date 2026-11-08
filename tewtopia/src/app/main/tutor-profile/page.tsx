import { redirect } from 'next/navigation';
import { TutorProfileForm } from '@/app/main/tutor-profile/_components/tutor-profile-form';
import { getCurrentUserSettings } from '@/lib/settings';
import { getCurrentTutorProfile } from '@/lib/tutor-profiles';

export default async function TutorProfilePage() {
  const [result, settingsResult] = await Promise.all([getCurrentTutorProfile(), getCurrentUserSettings()]);

  if (!result) {
    redirect('/auth');
  }

  if (result.profile.role !== 'tutor' || !result.tutorProfile) {
    redirect('/main/dashboard');
  }

  return (
    <TutorProfileForm
      profile={result.profile}
      tutorProfile={result.tutorProfile}
      initialError={result.error}
      visibility={settingsResult?.settings.profileVisibility ?? null}
    />
  );
}
