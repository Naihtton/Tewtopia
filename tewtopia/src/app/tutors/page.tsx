import { FilterBar } from '@/app/_components/filter-bar';
import { TopNav } from '@/app/_components/top-nav';
import { MainShell } from '@/app/main/_components/main-shell';
import { getCurrentUserProfile } from '@/lib/profiles';
import { filterTutors, hasActiveFilters, parseTutorFilters, subjectOptions } from '@/lib/filters';
import { TEACHING_MODES } from '@/lib/requests';
import { listPublicTutorCards } from '@/lib/tutor-profiles';
import { TEACHING_LEVELS } from '@/lib/tutor-visibility';
import { TutorBrowser } from './_components/tutor-browser';
import { ui } from '@/lib/ui';

// Public page: guests and signed-in users (students and tutors) can all browse.
type TutorsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TutorsPage({ searchParams }: TutorsPageProps) {
  const [params, profileResult, result] = await Promise.all([searchParams, getCurrentUserProfile(), listPublicTutorCards()]);
  const initialTutorId = typeof params.tutor === 'string' ? params.tutor : null;
  const filters = parseTutorFilters(params);
  const tutors = filterTutors(result.tutors, filters);

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
          <FilterBar
            selects={[
              {
                name: 'subject',
                label: 'Subject',
                anyLabel: 'Any subject',
                options: subjectOptions(result.tutors.map((tutor) => tutor.preferredSubjects)).map((subject) => ({
                  value: subject,
                  label: subject,
                })),
              },
              { name: 'level', label: 'Level', anyLabel: 'Any level', options: [...TEACHING_LEVELS] },
              { name: 'mode', label: 'Teaching mode', anyLabel: 'Any mode', options: [...TEACHING_MODES] },
            ]}
            search={{ name: 'q', placeholder: 'Search tutors by name or headline' }}
            number={{ name: 'maxRate', label: 'Max', placeholder: 'any' }}
            values={{
              q: filters.q ?? '',
              subject: filters.subject ?? '',
              level: filters.level ?? '',
              mode: filters.mode ?? '',
              maxRate: filters.maxRate ? String(filters.maxRate) : '',
            }}
            resultCount={tutors.length}
            noun={['tutor', 'tutors']}
          />
          {tutors.length === 0 && hasActiveFilters(filters) ? (
            <div className="rounded-[1.5rem] border border-line bg-white p-6 text-sm text-muted">
              No tutors match these filters. Try removing one.
            </div>
          ) : (
            <TutorBrowser tutors={tutors} isSignedIn={profileResult !== null} initialTutorId={initialTutorId} />
          )}
        </>
      )}
    </div>
  );

  if (profileResult) {
    const { profile } = profileResult;
    return (
      <MainShell username={profile.displayName || profile.email} role={profile.role} avatarUrl={profile.avatarUrl}>
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

