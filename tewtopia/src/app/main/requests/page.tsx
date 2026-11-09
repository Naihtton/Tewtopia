import { redirect } from 'next/navigation';
import { listMyRequestsWithOffers } from '@/lib/my-requests';
import { getCurrentUserProfile } from '@/lib/profiles';
import { ui } from '@/lib/ui';
import { MyRequests, PostRequestLink } from './_components/my-requests';

export default async function MyRequestsPage() {
  const result = await getCurrentUserProfile();

  if (!result) {
    redirect('/auth?next=/main/requests');
  }

  const { requests, error } = await listMyRequestsWithOffers(result.profile.id);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`${ui.title} text-4xl md:text-5xl`}>My requests</h1>
          <p className="mt-3 max-w-2xl text-base text-muted">
            Tutors send you offers with their price. Accept the ones you like to see their contact details.
          </p>
        </div>
        {/* Anyone keeps access to requests they own (e.g. after switching role); only students post new ones. */}
        {result.profile.role === 'student' && <PostRequestLink />}
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <MyRequests requests={requests} />
      )}
    </div>
  );
}
