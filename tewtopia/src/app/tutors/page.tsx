import { TopNav } from '@/app/_components/top-nav';
import { MainShell } from '@/app/main/_components/main-shell';
import { getCurrentUserProfile } from '@/lib/profiles';
import { listPublicTutorCards } from '@/lib/tutor-profiles';
import { TutorBrowser } from './_components/tutor-browser';
import { ui } from '@/lib/ui';

// Public page: guests and signed-in users (students and tutors) can all browse.
type TutorsPageProps = {
  searchParams: Promise<{ tutor?: string }>;
};

export default async function TutorsPage({ searchParams }: TutorsPageProps) {
  const [{ tutor: initialTutorId }, profileResult, result] = await Promise.all([
    searchParams,
    getCurrentUserProfile(),
    listPublicTutorCards(),
  ]);

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
          <span className={ui.chipAccent}>{result.tutors.length} {result.tutors.length === 1 ? 'tutor' : 'tutors'} available</span>
          <TutorBrowser
            tutors={result.tutors}
            isSignedIn={profileResult !== null}
            initialTutorId={initialTutorId ?? null}
          />
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

