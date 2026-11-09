import { FilterBar } from '@/app/_components/filter-bar';
import { TopNav } from '@/app/_components/top-nav';
import { MainShell } from '@/app/main/_components/main-shell';
import { filterRequests, parseRequestFilters, subjectOptions } from '@/lib/filters';
import { getCurrentUserProfile } from '@/lib/profiles';
import { DAYS, TEACHING_MODES } from '@/lib/requests';
import { TEACHING_LEVELS } from '@/lib/tutor-visibility';
import { getTutorBoardState, listOpenRequests, type MyOfferOnRequest } from '@/lib/request-board';
import { ui } from '@/lib/ui';
import { RequestBoard, type BoardViewer } from './_components/request-board';

type RequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Public page: anyone can browse open requests; listed tutors can send offers.
export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const [params, profileResult, result] = await Promise.all([searchParams, getCurrentUserProfile(), listOpenRequests()]);
  const initialRequestId = typeof params.request === 'string' ? params.request : null;
  const filters = parseRequestFilters(params);
  const requests = filterRequests(result.requests, filters);

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
        <>
          {result.requests.length > 0 && (
            <FilterBar
              selects={[
                {
                  name: 'subject',
                  label: 'Subject',
                  anyLabel: 'Any subject',
                  options: subjectOptions(result.requests.map((request) => request.subjects)).map((subject) => ({
                    value: subject,
                    label: subject,
                  })),
                },
                { name: 'level', label: 'Level', anyLabel: 'Any level', options: [...TEACHING_LEVELS] },
                { name: 'mode', label: 'Learning mode', anyLabel: 'Any mode', options: [...TEACHING_MODES] },
                { name: 'day', label: 'Day', anyLabel: 'Any day', options: [...DAYS] },
              ]}
              search={{ name: 'q', placeholder: 'Search by student name or details' }}
              values={{
                q: filters.q ?? '',
                subject: filters.subject ?? '',
                level: filters.level ?? '',
                mode: filters.mode ?? '',
                day: filters.day ?? '',
              }}
              resultCount={requests.length}
              noun={['request', 'requests']}
            />
          )}
          <RequestBoard
          requests={requests}
          allRequests={result.requests}
          viewer={viewer}
          myOffers={myOffers}
          initialRequestId={initialRequestId}
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
