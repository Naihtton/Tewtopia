import { TopNav } from '@/app/_components/top-nav';
import { MainShell } from '@/app/main/_components/main-shell';
import { getCurrentUserProfile } from '@/lib/profiles';
import { listPublicTutorCards, type BrowseTutorCard } from '@/lib/tutor-profiles';
import { TEACHING_LEVELS } from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

// Public page: guests and signed-in users (students and tutors) can all browse.
export default async function TutorsPage() {
  const [profileResult, result] = await Promise.all([getCurrentUserProfile(), listPublicTutorCards()]);

  const content = (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className={`${ui.title} text-4xl md:text-5xl`}>Find a tutor</h1>
        <p className="mt-3 max-w-3xl text-base text-muted">Browse tutors and compare subjects, levels and rates.</p>
      </div>

      {result.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      )}

      {result.error ? null : result.tutors.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-white p-6 text-sm text-muted">
          No tutors are available yet. Check back soon.
        </div>
      ) : (
        <>
          <span className={ui.chipAccent}>{result.tutors.length} tutors available</span>
          <div className="grid gap-4 lg:grid-cols-2">
            {result.tutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (profileResult) {
    const { profile } = profileResult;
    return (
      <MainShell username={profile.displayName || profile.email} role={profile.role}>
        {content}
      </MainShell>
    );
  }

  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={null} />
      <main className="flex flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl">{content}</div>
      </main>
    </div>
  );
}

function TutorCard({ tutor }: { tutor: BrowseTutorCard }) {
  const levelLabels = TEACHING_LEVELS.filter((level) => tutor.teachingLevels.includes(level.value)).map(
    (level) => level.label,
  );

  return (
    <section className={`${ui.panel} p-5`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-extrabold uppercase text-primary-deep">
            {tutor.displayName.slice(0, 1)}
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-ink">{tutor.displayName}</h2>
            <p className="mt-0.5 text-sm text-muted">{tutor.headline}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold text-ink">{tutor.hourlyRate} THB</p>
          <p className="text-xs text-muted">per hour</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tutor.preferredSubjects.map((subject) => (
          <span key={subject} className={ui.chipAccent}>
            {subject}
          </span>
        ))}
        {levelLabels.map((label) => (
          <span key={label} className={ui.chip}>
            {label}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Teaching modes</dt>
          <dd className="font-semibold text-ink">
            {tutor.teachingModes.length > 0 ? tutor.teachingModes.join(', ') : 'Not listed'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Experience</dt>
          <dd className="font-semibold text-ink">
            {tutor.yearsExperience !== null ? `${tutor.yearsExperience} years` : 'Not listed'}
          </dd>
        </div>
        {tutor.about && (
          <div className="sm:col-span-2">
            <dt className="text-muted">About</dt>
            <dd className="leading-6 text-ink-soft">{tutor.about}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
