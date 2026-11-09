import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listMyOffers } from '@/lib/my-requests';
import { getCurrentUserProfile } from '@/lib/profiles';
import { ui } from '@/lib/ui';
import { MyOffers } from './_components/my-offers';

export default async function MyOffersPage() {
  const result = await getCurrentUserProfile();

  if (!result) {
    redirect('/auth?next=/main/offers');
  }
  if (result.profile.role !== 'tutor') {
    redirect('/main/requests');
  }

  const { offers, error } = await listMyOffers(result.profile.id);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`${ui.title} text-4xl md:text-5xl`}>My offers</h1>
          <p className="mt-3 max-w-2xl text-base text-muted">
            When a student accepts your offer, their contact details appear here.
          </p>
        </div>
        <Link href="/requests" className={ui.buttonSecondary}>
          Request board
        </Link>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <MyOffers offers={offers} />
      )}
    </div>
  );
}
