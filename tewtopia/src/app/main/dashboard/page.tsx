import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/profiles';
import { getCurrentUserSettings } from '@/lib/settings';
import { hasAnyContact } from '@/lib/tutor-contact';
import { getCurrentTutorProfile } from '@/lib/tutor-profiles';
import { tutorSetupChecklist } from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

function buildChecklist(profile: {
  displayName: string;
  preferredSubjects: string[];
  bio: string;
  status: 'profile_incomplete' | 'profile_ready';
}) {
  return [
    {
      label: 'Set display name',
      done: profile.displayName.trim().length > 0,
    },
    {
      label: 'Choose preferred subjects',
      done: profile.preferredSubjects.length > 0,
    },
    {
      label: 'Add profile bio',
      done: profile.bio.trim().length > 0,
    },
    {
      label: 'Reach ready status',
      done: profile.status === 'profile_ready',
    },
  ];
}

export default async function DashboardPage() {
  const result = await getCurrentUserProfile();

  if (!result) {
    redirect('/auth');
  }

  const { profile } = result;
  const isTutor = profile.role === 'tutor';

  // Tutors: the checklist is the Find tutors listing rule, so "done" means students can see you.
  let checklist = buildChecklist(profile);
  if (isTutor) {
    const [tutorResult, settingsResult] = await Promise.all([getCurrentTutorProfile(), getCurrentUserSettings()]);
    const tutorProfile = tutorResult?.tutorProfile;
    checklist = tutorSetupChecklist({
      displayName: profile.displayName,
      subjects: profile.preferredSubjects,
      hourlyRate: tutorProfile?.hourlyRate ?? null,
      teachingLevels: tutorProfile?.teachingLevels ?? [],
      hasContact: tutorProfile ? hasAnyContact(tutorProfile.contacts) : false,
      visibility: settingsResult?.settings.profileVisibility ?? null,
    });
  }

  const completedCount = checklist.filter((item) => item.done).length;
  const isSetupComplete = completedCount === checklist.length;
  const headingName = profile.displayName || profile.email;
  const roleCopy = isTutor
    ? isSetupComplete
      ? 'You are visible to students on Find tutors.'
      : 'Students can’t see you on Find tutors yet. Finish the steps below to get listed.'
    : 'Your student workspace is ready for tutor matching, notes, and learning materials.';
  const primaryAction = isTutor
    ? { href: '/main/tutor-profile', label: 'Edit Tutor Profile' }
    : { href: '/tutors', label: 'Browse Tutors' };
  const secondaryAction = isTutor
    ? { href: '/tutors', label: 'See Find tutors' }
    : { href: '/main/profile', label: 'Update Learning Preferences' };
  const nextSteps = isTutor
    ? [
        'Add a clear headline and teaching modes so students know what you offer.',
        'Students contact you directly through the channels on your tutor profile.',
        'Check how your card looks on Find tutors.',
      ]
    : [
        'Add subjects you want help with in Profile.',
        'Browse public tutors and compare teaching styles.',
        'Use Settings to control who can see your information.',
      ];

  return (
    <div className="flex-1 space-y-6">
      <section className={`${ui.panel} px-6 py-8 lg:px-8`}>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">
          {isTutor ? 'Tutor dashboard' : 'Student dashboard'}
        </p>
        <h1 className={`${ui.title} mt-3 text-4xl md:text-5xl`}>Welcome back, {headingName}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">{roleCopy}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={primaryAction.href} className={ui.buttonPrimary}>
            {primaryAction.label}
          </Link>
          <Link href={secondaryAction.href} className={ui.buttonSecondary}>
            {secondaryAction.label}
          </Link>
        </div>
      </section>

      {/* Only nag about setup while something is still missing. */}
      {!isSetupComplete && (
        <section className={`${ui.panel} p-6`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className={`${ui.title} text-2xl`}>
                {isTutor ? 'Get listed on Find tutors' : 'Finish setting up your profile'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {completedCount} of {checklist.length} steps done.
              </p>
            </div>
            <Link href={isTutor ? '/main/tutor-profile' : '/main/profile'} className={ui.buttonSecondary}>
              {isTutor ? 'Go to tutor profile' : 'Go to profile'}
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm ${
                  item.done ? 'bg-emerald-50 text-emerald-900' : 'bg-cream text-ink-soft ring-1 ring-line'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.done ? 'bg-emerald-600 text-white' : 'bg-cream-deep text-muted'
                  }`}
                >
                  {item.done ? '✓' : ''}
                </span>
                <span className={item.done ? 'line-through decoration-emerald-900/30' : ''}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${ui.panel} p-6`}>
          <h2 className={`${ui.title} text-2xl`}>{isTutor ? 'Tutor next steps' : 'Student next steps'}</h2>
          <ol className="mt-5 space-y-3">
            {nextSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm leading-6 text-ink-soft">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-deep">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className={`${ui.panel} p-6`}>
          <h2 className={`${ui.title} text-2xl`}>Your profile</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Email</dt>
              <dd className="mt-1 font-semibold text-ink">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {isTutor ? 'Subjects you teach' : 'Subjects'}
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.preferredSubjects.length > 0 ? (
                  profile.preferredSubjects.map((subject) => (
                    <span key={subject} className={ui.chipAccent}>
                      {subject}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No subjects selected yet</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Bio</dt>
              <dd className="mt-1 leading-6 text-ink-soft">{profile.bio || 'No bio yet'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
