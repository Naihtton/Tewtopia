'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RequestSummary } from '@/app/_components/request-summary';
import { CounterpartContacts } from '@/app/main/_components/counterpart-contacts';
import { useRpc } from '@/app/main/_components/use-rpc';
import type { MyOffer } from '@/lib/my-requests';
import { isValidOfferRate, MIN_HOURLY_RATE } from '@/lib/rates';
import { OFFER_STATUS_LABEL, offerActions } from '@/lib/requests';
import { ui } from '@/lib/ui';

export function MyOffers({ offers }: { offers: MyOffer[] }) {
  if (offers.length === 0) {
    return (
      <div className={`${ui.panel} p-6 text-sm text-muted`}>
        You haven&apos;t sent any offers yet.{' '}
        <Link href="/requests" className="font-bold text-primary-deep underline underline-offset-2">
          Browse the request board
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

function OfferCard({ offer }: { offer: MyOffer }) {
  const { run, busy, error, setError } = useRpc();
  const [rate, setRate] = useState(String(offer.hourlyRate));
  const actions = offer.request ? offerActions(offer.status, offer.request.status, 'tutor') : [];
  const highlight = offer.status === 'accepted';

  function updatePrice(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(rate);
    if (!isValidOfferRate(value) || !offer.request) {
      setError(`Enter a whole number of at least ${MIN_HOURLY_RATE} THB/hr.`);
      return;
    }
    const requestId = offer.request.id;
    run((client) => client.rpc('submit_offer', { p_request: requestId, p_rate: value }));
  }

  return (
    <section className={`${ui.panel} p-5 ${highlight ? 'ring-2 ring-cta/40' : ''}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className={highlight ? ui.chipAccent : ui.chip}>
          {highlight ? 'Accepted — contact the student' : OFFER_STATUS_LABEL[offer.status]}
        </span>
        <span className="text-lg font-extrabold text-ink">{offer.hourlyRate} THB/hr</span>
      </div>

      {offer.request ? <RequestSummary request={offer.request} /> : <p className="text-sm text-muted">Request unavailable.</p>}

      {actions.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {actions.includes('edit_price') && (
            <form onSubmit={updatePrice} className="flex flex-wrap items-end gap-3">
              <div className="min-w-40">
                <label htmlFor={`rate-${offer.id}`} className="mb-1 block text-xs font-bold text-muted">
                  Price (THB/hr)
                </label>
                <input
                  id={`rate-${offer.id}`}
                  type="number"
                  min={MIN_HOURLY_RATE}
                  step={1}
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  className={ui.input}
                />
              </div>
              <button type="submit" disabled={busy} className={ui.buttonSecondary}>
                {offer.status === 'withdrawn' ? 'Send again' : 'Update price'}
              </button>
              {actions.includes('withdraw') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run((client) => client.rpc('withdraw_offer', { p_offer: offer.id }))}
                  className="text-sm font-bold text-muted underline-offset-2 hover:text-ink hover:underline"
                >
                  Withdraw
                </button>
              )}
            </form>
          )}
          {actions.includes('confirm_deal') && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Confirm the deal with this student? Their request will close.')) {
                  run((client) => client.rpc('confirm_deal', { p_offer: offer.id }));
                }
              }}
              className={ui.buttonPrimary}
            >
              Confirm deal
            </button>
          )}
          {actions.includes('view_contact') && <CounterpartContacts offerId={offer.id} label="View student contact" />}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
