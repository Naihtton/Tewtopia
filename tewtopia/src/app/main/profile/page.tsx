import { redirect } from 'next/navigation';
import { ProfileForm } from '@/app/main/profile/_components/profile-form';
import { getCurrentUserProfile } from '@/lib/profiles';
import { getCurrentTutorChecklist } from '@/lib/tutor-listing';

export default async function ProfilePage() {
  const result = await getCurrentUserProfile();

  if (!result) {
    redirect('/auth');
  }

  const tutorChecklist = result.profile.role === 'tutor' ? await getCurrentTutorChecklist(result.profile) : null;

  return (
    <ProfileForm initialProfile={result.profile} initialError={result.error} tutorChecklist={tutorChecklist} />
  );
}
