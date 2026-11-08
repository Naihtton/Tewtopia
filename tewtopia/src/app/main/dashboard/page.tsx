import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PdfViewerPanel } from '@/features/pdf/components/pdf-viewer-panel';
import mockPdf from '@/features/pdf/data/mockPdf';
import { getCurrentUserProfile } from '@/lib/profiles';
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
  const checklist = buildChecklist(profile);
  const completedCount = checklist.filter((item) => item.done).length;
  const headingName = profile.displayName || profile.email;
  const subjectsLabel =
    profile.preferredSubjects.length > 0 ? profile.preferredSubjects.join(', ') : 'No subjects selected yet';
  const roleCopy =
    profile.role === 'tutor'
      ? 'Your tutor workspace is ready for availability, materials, and learner requests.'
      : 'Your student workspace is ready for tutor matching, notes, and learning materials.';
  const primaryAction =
    profile.role === 'tutor'
      ? { href: '/main/tutor-profile', label: 'Edit Tutor Profile' }
      : { href: '/main/tutors', label: 'Browse Tutors' };
  const secondaryAction =
    profile.role === 'tutor'
      ? { href: '/main/settings', label: 'Review Visibility Settings' }
      : { href: '/main/profile', label: 'Update Learning Preferences' };

  return (
    <div className="flex-1 space-y-6">
      <section className={`${ui.panel} overflow-hidden`}>
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1.35fr),minmax(18rem,0.65fr)] lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-stone-400">
              {profile.role === 'tutor' ? 'Tutor dashboard' : 'Student dashboard'}
            </p>
            <h1 className={`${ui.title} mt-3 text-5xl md:text-6xl`}>Welcome back, {headingName}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{roleCopy}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={primaryAction.href} className={ui.buttonPrimary}>
                {primaryAction.label}
              </Link>
              <Link href={secondaryAction.href} className={ui.buttonSecondary}>
                {secondaryAction.label}
              </Link>
            </div>
          </div>

          <div className="rounded-[1.6rem] bg-stone-950 p-5 text-stone-50">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">At a glance</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-white/7 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Profile status</p>
                <p className="mt-2 text-xl font-semibold">
                  {profile.status === 'profile_ready' ? 'Ready to use' : 'Needs setup'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/7 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Completed setup</p>
                <p className="mt-2 text-xl font-semibold">
                  {completedCount}/{checklist.length} items
                </p>
              </div>
              <div className="rounded-2xl bg-white/7 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Subjects</p>
                <p className="mt-2 text-sm leading-6 text-stone-200">{subjectsLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={`${ui.panel} p-5`}>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Role</p>
          <p className="mt-3 text-2xl font-semibold capitalize text-stone-950">{profile.role}</p>
        </div>
        <div className={`${ui.panel} p-5`}>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Profile status</p>
          <p className="mt-3 text-2xl font-semibold text-stone-950">
            {profile.status === 'profile_ready' ? 'Ready' : 'Incomplete'}
          </p>
        </div>
        <div className={`${ui.panel} p-5`}>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Preferred subjects</p>
          <p className="mt-3 text-sm font-medium leading-6 text-stone-800">{subjectsLabel}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr),minmax(0,0.88fr)]">
        <section className={`${ui.panel} p-6`}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className={`${ui.title} text-3xl`}>Profile checklist</h2>
              <p className="mt-2 text-sm text-stone-500">
                {completedCount} of {checklist.length} setup items completed.
              </p>
            </div>
            <span className={ui.chipAccent}>{Math.round((completedCount / checklist.length) * 100)}% complete</span>
          </div>
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-[1.2rem] px-4 py-4 text-sm ${
                  item.done
                    ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100'
                    : 'bg-stone-50 text-stone-700 ring-1 ring-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      item.done ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{item.label}</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  {item.done ? 'Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={`${ui.panel} p-6`}>
          <div className="mb-5">
            <h2 className={`${ui.title} text-3xl`}>Profile summary</h2>
            <p className="mt-2 text-sm text-stone-500">Live values currently stored in your workspace.</p>
          </div>
          <dl className="grid gap-4 text-sm">
            <div className="rounded-[1.1rem] bg-stone-50 px-4 py-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Email</dt>
              <dd className="mt-2 font-medium text-stone-900">{profile.email}</dd>
            </div>
            <div className="rounded-[1.1rem] bg-stone-50 px-4 py-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Display name</dt>
              <dd className="mt-2 font-medium text-stone-900">{profile.displayName || 'Not set'}</dd>
            </div>
            <div className="rounded-[1.1rem] bg-stone-50 px-4 py-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-stone-400">Bio</dt>
              <dd className="mt-2 font-medium leading-6 text-stone-900">{profile.bio || 'No bio yet'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={`${ui.panel} p-6`}>
        <div className="mb-5">
          <h2 className={`${ui.title} text-3xl`}>{profile.role === 'tutor' ? 'Tutor next steps' : 'Student next steps'}</h2>
          <p className="mt-2 text-sm text-stone-500">
            {profile.role === 'tutor'
              ? 'Prepare your public tutor card so students can discover you.'
              : 'Use your profile and tutor browser to find the right learning fit.'}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(profile.role === 'tutor'
            ? [
                'Complete tutor headline and teaching modes.',
                'Set profile visibility to public in Settings.',
                'Review your public card from the tutor profile page.',
              ]
            : [
                'Add subjects you want help with in Profile.',
                'Browse public tutors and compare teaching styles.',
                'Use Settings to control who can see your information.',
              ]
          ).map((item) => (
            <div key={item} className="rounded-[1.25rem] bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-700 ring-1 ring-stone-100">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className={`${ui.panel} p-6`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className={`${ui.title} text-3xl`}>Document preview</h2>
            <p className="mt-2 text-sm text-stone-500">Reference area for notes, worksheets, and learner materials.</p>
          </div>
          <span className={ui.chip}>PDF workspace</span>
        </div>
        <PdfViewerPanel fileUrl={mockPdf} />
      </section>
    </div>
  );
}
