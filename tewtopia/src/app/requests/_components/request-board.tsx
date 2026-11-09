'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/app/_components/modal';
import { RequestSummary } from '@/app/_components/request-summary';
import { isValidOfferRate, MIN_HOURLY_RATE } from '@/lib/rates';
import type { MyOfferOnRequest, RequestCard } from '@/lib/request-board';
import { OFFER_STATUS_LABEL } from '@/lib/requests';
import { createClient } from '@/lib/supabase/client';
import { ui } from '@/lib/ui';

export type BoardViewer = 'guest' | 'student' | 'tutor-listed' | 'tutor-unlisted';

type RequestBoardProps = {
  // After filters; shown in the grid.
  requests: RequestCard[];
  // Before filters; a shared ?request= link still opens even if filters hide it.
  allRequests: RequestCard[];
  viewer: BoardViewer;
  myOffers: Record<string, MyOfferOnRequest>;
  // From ?request=<id>, so a shared link or a return from log-in reopens the modal.
  initialRequestId: string | null;
};

function requestUrl(id: string | null) {
  return id ? `/requests?request=${encodeURIComponent(id)}` : '/requests';
}

export function RequestBoard({ requests, allRequests, viewer, myOffers, initialRequestId }: RequestBoardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialRequestId);
  const selected = allRequests.find((request) => request.id === selectedId) ?? null;

  function select(id: string | null) {
    setSelectedId(id);
    window.history.replaceState(null, '', requestUrl(id));
  }

  return (
    <>
      {requests.length === 0 ? (
        <div className="rounded-[1.5rem] border border-line bg-white p-6 text-sm text-muted">
          {allRequests.length === 0 ? 'No open requests right now. Check back soon.' : 'No requests match these filters. Try removing one.'}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => select(request.id)}
              className={`${ui.panel} p-5 text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(46,36,51,0.09)] focus-visible:outline-2 focus-visible:outline-primary`}
            >
              <RequestSummary request={request} />
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-bold text-primary-deep">View request →</span>
                <span className="text-xs text-muted">
                  {request.offerCount} {request.offerCount === 1 ? 'offer' : 'offers'}
                  {myOffers[request.id] && ` · yours: ${OFFER_STATUS_LABEL[myOffers[request.id].status]}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <Modal key={selectedId} labelledBy="request-modal-title" onClose={() => select(null)}>
          <h2 id="request-modal-title" className={`${ui.title} mb-4 text-2xl`}>
            Student request
          </h2>
          {selected ? (
            <>
              <RequestSummary request={selected} full />
              <div className="mt-6 border-t border-line pt-5">
                <OfferPanel request={selected} viewer={viewer} myOffer={myOffers[selected.id] ?? null} />
              </div>
            </>
          ) : (
            // Review Focus: a shared link to a request that has since closed.
            <p className="text-sm text-muted">This request is no longer open.</p>
          )}
        </Modal>
      )}
    </>
  );
}

function OfferPanel({
  request,
  viewer,
  myOffer,
}: {
  request: RequestCard;
  viewer: BoardViewer;
  myOffer: MyOfferOnRequest | null;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(myOffer ? String(myOffer.hourlyRate) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (viewer === 'guest') {
    return (
      <>
        <Link href={`/auth?next=${encodeURIComponent(requestUrl(request.id))}`} className={`${ui.buttonPrimary} w-full`}>
          Log in as a tutor to send an offer
        </Link>
        <p className="mt-2 text-center text-xs text-muted">Students can post their own requests from My requests.</p>
      </>
    );
  }
  if (viewer === 'student') {
    return <p className="text-center text-sm text-muted">Only tutors can send offers.</p>;
  }
  if (viewer === 'tutor-unlisted') {
    return (
      <p className="text-center text-sm text-muted">
        Finish your tutor profile to send offers.{' '}
        <Link href="/main/tutor-profile" className="font-bold text-primary-deep underline underline-offset-2">
          Open Tutor profile
        </Link>
      </p>
    );
  }

  const canEdit = !myOffer || myOffer.status === 'pending' || myOffer.status === 'withdrawn';

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, message: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    const { error: rpcError } = await action();
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setDone(message);
    router.refresh();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(rate);
    if (!isValidOfferRate(value)) {
      setError(`Enter a whole number of at least ${MIN_HOURLY_RATE} THB/hr.`);
      return;
    }
    run(
      () => createClient().rpc('submit_offer', { p_request: request.id, p_rate: value }),
      myOffer && myOffer.status === 'pending' ? 'Price updated.' : 'Offer sent. The student will see it in their requests.',
    );
  }

  return (
    <div>
      {myOffer && (
        <p className="mb-3 text-sm text-ink-soft">
          Your offer: <span className="font-bold text-ink">{myOffer.hourlyRate} THB/hr</span> ·{' '}
          {OFFER_STATUS_LABEL[myOffer.status]}
        </p>
      )}
      {canEdit ? (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label htmlFor="offer-rate" className={ui.label}>
              Your price (THB per hour)
            </label>
            <input
              id="offer-rate"
              type="number"
              min={MIN_HOURLY_RATE}
              step={1}
              required
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className={ui.input}
              placeholder="400"
            />
          </div>
          <button type="submit" disabled={busy} className={`${ui.buttonPrimary} disabled:cursor-wait`}>
            {busy ? 'Sending...' : myOffer?.status === 'pending' ? 'Update price' : 'Send offer'}
          </button>
          {myOffer?.status === 'pending' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => createClient().rpc('withdraw_offer', { p_offer: myOffer.id }), 'Offer withdrawn.')}
              className={ui.buttonSecondary}
            >
              Withdraw
            </button>
          )}
        </form>
      ) : (
        <p className="text-sm text-muted">
          Manage this offer in{' '}
          <Link href="/main/offers" className="font-bold text-primary-deep underline underline-offset-2">
            My offers
          </Link>
          .
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Minimum {MIN_HOURLY_RATE} THB/hr. Only this student sees your price.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {done && <p className="mt-2 text-sm font-semibold text-emerald-700">{done}</p>}
    </div>
  );
}
