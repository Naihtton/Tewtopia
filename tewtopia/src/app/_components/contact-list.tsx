'use client';

import { useState } from 'react';
import type { ContactLink } from '@/lib/contact';

export function ContactList({ links }: { links: ContactLink[] }) {
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
