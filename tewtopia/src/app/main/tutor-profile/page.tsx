import { redirect } from 'next/navigation';
import { TutorProfileForm } from '@/app/main/tutor-profile/_components/tutor-profile-form';
import { getCurrentTutorProfile } from '@/lib/tutor-profiles';

export default async function TutorProfilePage() {
  const result = await getCurrentTutorProfile();

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
    />
  );
}
