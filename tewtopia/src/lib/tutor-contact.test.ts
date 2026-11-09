import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contactLinks, hasAnyContact, normalizeContactDetails } from './tutor-contact.ts';

test('normalizeContactDetails trims, caps at 100 chars and drops non-strings', () => {
  const long = 'x'.repeat(150);
  assert.deepEqual(
    normalizeContactDetails({ instagram: '  @pim.math ', facebook: 42, phone: ' 081-234-5678 ', line: long }),
    { instagram: '@pim.math', facebook: '', phone: '081-234-5678', line: 'x'.repeat(100) },
  );
  assert.deepEqual(normalizeContactDetails(null), { instagram: '', facebook: '', phone: '', line: '' });
});

test('hasAnyContact', () => {
  assert.equal(hasAnyContact({ instagram: '', facebook: '', phone: '', line: '' }), false);
  assert.equal(hasAnyContact({ instagram: '', facebook: '', phone: '', line: 'pim' }), true);
});

test('contactLinks builds hrefs only for filled channels, in a fixed order', () => {
  const links = contactLinks({ instagram: '@pim.math', facebook: 'https://facebook.com/pim', phone: '081-234 5678', line: '@pimline' });
  assert.deepEqual(
    links.map((link) => [link.channel, link.value, link.href]),
    [
      ['instagram', '@pim.math', 'https://instagram.com/pim.math'],
      ['facebook', 'https://facebook.com/pim', 'https://facebook.com/pim'],
      ['phone', '081-234 5678', 'tel:0812345678'],
      ['line', '@pimline', 'https://line.me/ti/p/~pimline'],
    ],
  );
  assert.deepEqual(contactLinks({ instagram: '', facebook: '', phone: '', line: 'pim' }).map((l) => l.channel), ['line']);
});

test('contactLinks never links unsafe or non-URL facebook values', () => {
  for (const value of ['Pim Tutor', 'javascript:alert(1)', 'http://evil.com/x']) {
    const [link] = contactLinks({ instagram: '', facebook: value, phone: '', line: '' });
    assert.equal(link.href, null, value);
  }
  const [fbHttp] = contactLinks({ instagram: '', facebook: 'facebook.com/pim', phone: '', line: '' });
  assert.equal(fbHttp.href, 'https://facebook.com/pim');
});

test('contactLinks keeps a leading + on phone numbers', () => {
  const [phone] = contactLinks({ instagram: '', facebook: '', phone: '+66 81 234 5678', line: '' });
  assert.equal(phone.href, 'tel:+66812345678');
});
