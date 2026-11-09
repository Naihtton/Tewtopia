import { TopNav } from '@/app/_components/top-nav';
import { MainShell } from '@/app/main/_components/main-shell';
import { getCurrentUserProfile } from '@/lib/profiles';
import { getTutorBoardState, listOpenRequests, type MyOfferOnRequest } from '@/lib/request-board';
import { ui } from '@/lib/ui';
import { RequestBoard, type BoardViewer } from './_components/request-board';

type RequestsPageProps = {
  searchParams: Promise<{ request?: string }>;
};

// Public page: anyone can browse open requests; listed tutors can send offers.
export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const [{ request: initialRequestId }, profileResult, result] = await Promise.all([
    searchParams,
    getCurrentUserProfile(),
    listOpenRequests(),
  ]);

  let viewer: BoardViewer = 'guest';
  let myOffers: Record<string, MyOfferOnRequest> = {};
  if (profileResult?.profile.role === 'tutor') {
    const state = await getTutorBoardState(profileResult.profile.id);
    viewer = state.isListed ? 'tutor-listed' : 'tutor-unlisted';
    myOffers = state.offersByRequest;
  } else if (profileResult) {
    viewer = 'student';
  }

  const content = (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className={`${ui.title} text-4xl md:text-5xl`}>Request board</h1>
        <p className="mt-3 max-w-3xl text-base text-muted">
          Students looking for a tutor. Send an offer with your hourly price.
        </p>
      </div>

      {result.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      ) : (
        <RequestBoard
          requests={result.requests}
          viewer={viewer}
          myOffers={myOffers}
          initialRequestId={initialRequestId ?? null}
        />
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
