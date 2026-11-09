'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Modal } from '@/app/_components/modal';
import { RequestSummary } from '@/app/_components/request-summary';
import { CounterpartContacts } from '@/app/main/_components/counterpart-contacts';
import { useRpc } from '@/app/main/_components/use-rpc';
import { TutorSummary } from '@/app/tutors/_components/tutor-browser';
import type { MyRequest, OfferForStudent } from '@/lib/my-requests';
import { OFFER_STATUS_LABEL, offerActions, type RequestStatus } from '@/lib/requests';
import type { BrowseTutorCard } from '@/lib/tutor-profiles';
import { ui } from '@/lib/ui';

const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Open',
  closed: 'Deal done',
  cancelled: 'Cancelled',
};

export function MyRequests({ requests }: { requests: MyRequest[] }) {
  const [viewTutor, setViewTutor] = useState<BrowseTutorCard | null>(null);

  if (requests.length === 0) {
    return (
      <div className={`${ui.panel} p-6 text-sm text-muted`}>
        You haven&apos;t posted any requests yet. Tell tutors what you need and they&apos;ll send you offers.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} onViewTutor={setViewTutor} />
        ))}
      </div>

      {viewTutor && (
        <Modal labelledBy="offer-tutor-title" onClose={() => setViewTutor(null)}>
          <span id="offer-tutor-title" className="sr-only">
            {viewTutor.displayName}
          </span>
          <TutorSummary tutor={viewTutor} full />
        </Modal>
      )}
    </>
  );
}

function RequestCard({ request, onViewTutor }: { request: MyRequest; onViewTutor: (tutor: BrowseTutorCard) => void }) {
  const { run, busy, error } = useRpc();
  const isOpen = request.status === 'open';

  return (
    <section className={`${ui.panel} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className={isOpen ? ui.chipAccent : ui.chip}>{REQUEST_STATUS_LABEL[request.status]}</span>
        {isOpen && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Cancel this request? Tutors will no longer see it, and open offers will be closed.')) {
                run((client) => client.rpc('cancel_request', { p_request: request.id }));
              }
            }}
            className="text-sm font-bold text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Cancel request
          </button>
        )}
      </div>
      <RequestSummary request={request} />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-muted">
          Offers ({request.offers.length})
        </h3>
        {request.offers.length === 0 ? (
          <p className="text-sm text-muted">{isOpen ? 'No offers yet. Tutors will see your request on the board.' : 'No offers.'}</p>
        ) : (
          <ul className="space-y-3">
            {request.offers.map((offer) => (
              <OfferRow key={offer.id} offer={offer} requestStatus={request.status} onViewTutor={onViewTutor} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function OfferRow({
  offer,
  requestStatus,
  onViewTutor,
}: {
  offer: OfferForStudent;
  requestStatus: RequestStatus;
  onViewTutor: (tutor: BrowseTutorCard) => void;
}) {
  const { run, busy, error } = useRpc();
  const actions = offerActions(offer.status, requestStatus, 'student');

  return (
    <li className="rounded-2xl bg-cream px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          {offer.tutor ? (
            <button
              type="button"
              onClick={() => onViewTutor(offer.tutor!)}
              className="font-extrabold text-primary-deep underline-offset-2 hover:underline"
            >
              {offer.tutor.displayName}
            </button>
          ) : (
            <span className="font-extrabold text-muted">Tutor (no longer listed)</span>
          )}
          <span className="ml-2 text-xs font-bold text-muted">{OFFER_STATUS_LABEL[offer.status]}</span>
        </div>
        <span className="text-lg font-extrabold text-ink">{offer.hourlyRate} THB/hr</span>
      </div>

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {actions.includes('accept') && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run((client) => client.rpc('accept_offer', { p_offer: offer.id }))}
              className={ui.buttonPrimary}
            >
              Accept
            </button>
          )}
          {actions.includes('confirm_deal') && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Confirm the deal with this tutor? Your request will close and other offers will end.')) {
                  run((client) => client.rpc('confirm_deal', { p_offer: offer.id }));
                }
              }}
              className={ui.buttonPrimary}
            >
              Confirm deal
            </button>
          )}
          {actions.includes('decline') && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const message =
                  offer.status === 'accepted'
                    ? 'Decline this offer? The tutor will no longer see your contact details.'
                    : 'Decline this offer?';
                if (window.confirm(message)) {
                  run((client) => client.rpc('decline_offer', { p_offer: offer.id }));
                }
              }}
              className="text-sm font-bold text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Decline
            </button>
          )}
        </div>
      )}
      {actions.includes('view_contact') && (
        <div className="mt-3">
          <CounterpartContacts offerId={offer.id} label="View tutor contact" />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}

export function PostRequestLink() {
  return (
    <Link href="/main/requests/new" className={ui.buttonPrimary}>
      Post a request
    </Link>
  );
}
