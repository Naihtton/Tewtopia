'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatRate } from '@/lib/rates';
import { createClient } from '@/lib/supabase/client';
import { contactLinks, normalizeContactDetails, type ContactLink } from '@/lib/tutor-contact';
import type { BrowseTutorCard } from '@/lib/tutor-profiles';
import { TEACHING_LEVELS } from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

type TutorBrowserProps = {
  tutors: BrowseTutorCard[];
  isSignedIn: boolean;
  // From ?tutor=<id>, so a shared link or a return from log-in reopens the modal.
  initialTutorId: string | null;
};

function levelLabels(tutor: BrowseTutorCard) {
  return TEACHING_LEVELS.filter((level) => tutor.teachingLevels.includes(level.value)).map((level) => level.label);
}

function tutorUrl(id: string | null) {
  return id ? `/tutors?tutor=${encodeURIComponent(id)}` : '/tutors';
}

export function TutorBrowser({ tutors, isSignedIn, initialTutorId }: TutorBrowserProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTutorId && tutors.some((tutor) => tutor.id === initialTutorId) ? initialTutorId : null,
  );
  const selected = tutors.find((tutor) => tutor.id === selectedId) ?? null;

  function select(id: string | null) {
    setSelectedId(id);
    // Keep the URL shareable without a server round-trip.
    window.history.replaceState(null, '', tutorUrl(id));
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {tutors.map((tutor) => (
          <button
            key={tutor.id}
            type="button"
            onClick={() => select(tutor.id)}
            className={`${ui.panel} p-5 text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(46,36,51,0.09)] focus-visible:outline-2 focus-visible:outline-primary`}
          >
            <TutorSummary tutor={tutor} />
            <span className="mt-4 inline-block text-sm font-bold text-primary-deep">View profile →</span>
          </button>
        ))}
      </div>

      {selected && (
        <TutorModal key={selected.id} tutor={selected} isSignedIn={isSignedIn} onClose={() => select(null)} />
      )}
    </>
  );
}

function TutorSummary({ tutor, full = false }: { tutor: BrowseTutorCard; full?: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-extrabold uppercase text-primary-deep">
            {tutor.displayName.slice(0, 1)}
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-ink">{tutor.displayName}</h2>
            <p className="mt-0.5 text-sm text-muted">{tutor.headline}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold text-ink">{formatRate(tutor.rateMin, tutor.rateMax)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tutor.preferredSubjects.map((subject) => (
          <span key={subject} className={ui.chipAccent}>
            {subject}
          </span>
        ))}
        {levelLabels(tutor).map((label) => (
          <span key={label} className={ui.chip}>
            {label}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Teaching modes</dt>
          <dd className="font-semibold text-ink">
            {tutor.teachingModes.length > 0 ? tutor.teachingModes.join(', ') : 'Not listed'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Experience</dt>
          <dd className="font-semibold text-ink">
            {tutor.yearsExperience !== null ? `${tutor.yearsExperience} years` : 'Not listed'}
          </dd>
        </div>
        {tutor.about && (
          <div className="sm:col-span-2">
            <dt className="text-muted">About</dt>
            <dd className={`leading-6 text-ink-soft ${full ? 'whitespace-pre-line' : 'line-clamp-3'}`}>{tutor.about}</dd>
          </div>
        )}
      </dl>
    </>
  );
}

type ContactState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; links: ContactLink[] }
  | { status: 'error' };

function TutorModal({
  tutor,
  isSignedIn,
  onClose,
}: {
  tutor: BrowseTutorCard;
  isSignedIn: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [contact, setContact] = useState<ContactState>({ status: 'idle' });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  async function revealContacts() {
    setContact({ status: 'loading' });
    const { data, error } = await createClient().rpc('get_tutor_contacts', { tutor: tutor.id });

    if (error) {
      setContact({ status: 'error' });
      return;
    }

    const row = Array.isArray(data) ? data[0] : null;
    setContact({ status: 'ready', links: row ? contactLinks(normalizeContactDetails(row)) : [] });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="tutor-modal-title"
      onClose={onClose}
      // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-[1.75rem] bg-white p-0 text-ink shadow-[0_24px_60px_rgba(46,36,51,0.25)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted outline-none hover:bg-cream hover:text-ink focus-visible:ring-2 focus-visible:ring-primary"
          >
            ×
          </button>
        </div>

        <span id="tutor-modal-title" className="sr-only">
          {tutor.displayName}
        </span>
        <TutorSummary tutor={tutor} full />

        <div className="mt-6 border-t border-line pt-5">
          {contact.status === 'ready' ? (
            <ContactList links={contact.links} />
          ) : isSignedIn ? (
            <>
              <button
                type="button"
                onClick={revealContacts}
                disabled={contact.status === 'loading'}
                className={`${ui.buttonPrimary} w-full disabled:cursor-wait`}
              >
                {contact.status === 'loading' ? 'Loading contacts...' : 'Contact tutor'}
              </button>
              {contact.status === 'error' && (
                <p className="mt-2 text-center text-sm text-red-600">Couldn&apos;t load contact details. Please try again.</p>
              )}
            </>
          ) : (
            <>
              <Link
                href={`/auth?next=${encodeURIComponent(tutorUrl(tutor.id))}`}
                className={`${ui.buttonPrimary} w-full`}
              >
                Contact tutor
              </Link>
              <p className="mt-2 text-center text-xs text-muted">Log in or create a free account to see contact details.</p>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

function ContactList({ links }: { links: ContactLink[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (links.length === 0) {
    return <p className="text-center text-sm text-muted">This tutor hasn&apos;t shared contact details yet.</p>;
  }

  async function copy(link: ContactLink) {
    try {
      await navigator.clipboard.writeText(link.value);
      setCopied(link.channel);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Contact</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.channel} className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-3">
            <span className="w-20 shrink-0 text-xs font-bold text-muted">{link.label}</span>
            {link.href ? (
              <a
                href={link.href}
                target={link.channel === 'phone' ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-bold text-primary-deep underline-offset-2 hover:underline"
              >
                {link.value}
              </a>
            ) : (
              <span className="min-w-0 flex-1 truncate font-bold text-ink">{link.value}</span>
            )}
            <button
              type="button"
              onClick={() => copy(link)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-muted hover:bg-white hover:text-ink"
            >
              {copied === link.channel ? 'Copied' : 'Copy'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
