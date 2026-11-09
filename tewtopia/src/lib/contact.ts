// Pure helpers (no `@/` imports) so `node --test` can load them directly.

export type ContactChannel = 'instagram' | 'facebook' | 'phone' | 'line';

export type ContactDetails = Record<ContactChannel, string>;

export const CONTACT_CHANNELS: readonly { channel: ContactChannel; label: string; placeholder: string }[] = [
  { channel: 'instagram', label: 'Instagram', placeholder: '@yourname' },
  { channel: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourpage or your name' },
  { channel: 'phone', label: 'Phone', placeholder: '081-234-5678' },
  { channel: 'line', label: 'Line ID', placeholder: 'yourlineid' },
];

const MAX_LENGTH = 100;

export const EMPTY_CONTACT_DETAILS: ContactDetails = { instagram: '', facebook: '', phone: '', line: '' };

export function normalizeContactDetails(input: unknown): ContactDetails {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const clean = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, MAX_LENGTH) : '');

  return {
    instagram: clean(source.instagram),
    facebook: clean(source.facebook),
    phone: clean(source.phone),
    line: clean(source.line),
  };
}

export function hasAnyContact(details: ContactDetails): boolean {
  return CONTACT_CHANNELS.some(({ channel }) => details[channel].length > 0);
}

function stripAt(value: string) {
  return value.replace(/^@+/, '');
}

function facebookHref(value: string): string | null {
  // Only link to Facebook itself; anything else is shown as plain text.
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    const isFacebook = host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host === 'fb.me';
    return isFacebook && url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

export type ContactLink = { channel: ContactChannel; label: string; value: string; href: string | null };

export function contactLinks(details: ContactDetails): ContactLink[] {
  return CONTACT_CHANNELS.filter(({ channel }) => details[channel].length > 0).map(({ channel, label }) => {
    const value = details[channel];
    let href: string | null = null;

    if (channel === 'instagram') href = `https://instagram.com/${encodeURIComponent(stripAt(value))}`;
    if (channel === 'facebook') href = facebookHref(value);
    if (channel === 'phone') href = `tel:${value.replace(/(?!^\+)[^\d]/g, '')}`;
    if (channel === 'line') href = `https://line.me/ti/p/~${encodeURIComponent(stripAt(value))}`;

    return { channel, label, value, href };
  });
}
