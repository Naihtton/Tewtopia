'use client';

import { useState } from 'react';
import { ContactList } from '@/app/_components/contact-list';
import { contactLinks, normalizeContactDetails, type ContactLink } from '@/lib/contact';
import { createClient } from '@/lib/supabase/client';
import { ui } from '@/lib/ui';

type State = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; name: string; links: ContactLink[] };

/** "View contact" for an accepted offer: the other side's name and channels (get_offer_counterpart). */
export function CounterpartContacts({ offerId, label }: { offerId: string; label: string }) {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function load() {
    setState({ status: 'loading' });
    const { data, error } = await createClient().rpc('get_offer_counterpart', { p_offer: offerId });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'ready', name: row.display_name, links: contactLinks(normalizeContactDetails(row)) });
  }

  if (state.status === 'ready') {
    return (
      <div className="mt-3 rounded-2xl border border-line bg-white p-4">
        <p className="mb-2 text-sm font-extrabold text-ink">{state.name}</p>
        <ContactList links={state.links} />
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={load} disabled={state.status === 'loading'} className={ui.buttonSecondary}>
        {state.status === 'loading' ? 'Loading...' : label}
      </button>
      {state.status === 'error' && <p className="mt-2 text-sm text-red-600">Contact details aren&apos;t available.</p>}
    </>
  );
}
