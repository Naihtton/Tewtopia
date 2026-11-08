import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profiles';
import { listVisibleTutorsForStudents } from '@/lib/tutor-profiles';
import { ui } from '@/lib/ui';

export default async function TutorsPage() {
  const profileResult = await getCurrentUserProfile();

  if (!profileResult) {
    redirect('/auth');
  }

  if (profileResult.profile.role !== 'student') {
    redirect('/main/dashboard');
  }

  const result = await listVisibleTutorsForStudents();

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`${ui.title} text-4xl md:text-5xl`}>Browse Tutors</h1>
          <p className="mt-3 max-w-3xl text-base text-stone-500">
            Public tutor profiles are shown here. Profiles set to matched-only or private stay hidden until matching exists.
          </p>
        </div>
        <Link href="/main/settings" className={ui.buttonSecondary}>
          Privacy settings
        </Link>
      </div>

      {result.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}

      {result.tutors.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          No public tutor profiles are available yet.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <span className={ui.chipAccent}>
              {result.tutors.length} tutors visible
            </span>
            <span className={ui.chip}>
              Only public profiles are shown
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
          {result.tutors.map((tutor) => (
            <section key={tutor.id} className={`${ui.panel} p-5`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-950">{tutor.displayName}</h2>
                  <p className="mt-1 text-sm text-stone-500">{tutor.headline}</p>
                </div>
                <div className={ui.chip}>
                  {tutor.hourlyRate ? `${tutor.hourlyRate} THB/hr` : 'Ask rate'}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {tutor.preferredSubjects.length > 0 ? (
                  tutor.preferredSubjects.map((subject) => (
                    <span key={subject} className={ui.chipAccent}>
                      {subject}
                    </span>
                  ))
                ) : (
                  <span className={ui.chip}>No subjects listed</span>
                )}
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-stone-500">Teaching modes</dt>
                  <dd className="font-medium text-stone-900">
                    {tutor.teachingModes.length > 0 ? tutor.teachingModes.join(', ') : 'Not listed'}
                  </dd>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-stone-500">Experience</dt>
                    <dd className="font-medium text-stone-900">
                      {tutor.yearsExperience !== null ? `${tutor.yearsExperience} years` : 'Not listed'}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-stone-500">About</dt>
                  <dd className="font-medium leading-6 text-stone-900">{tutor.about || 'No description yet'}</dd>
                </div>
              </dl>
            </section>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
