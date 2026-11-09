// Pure helpers (no `@/` imports) so `node --test` can load them directly.

export type NavRole = 'student' | 'tutor';
export type NavBadge = 'pendingOffers' | 'acceptedOffers';
export type NavTab = { href: string; label: string; badge?: NavBadge };

const MY_REQUESTS: NavTab = { href: '/main/requests', label: 'My requests', badge: 'pendingOffers' };
const MY_OFFERS: NavTab = { href: '/main/offers', label: 'My offers', badge: 'acceptedOffers' };

/**
 * Tabs by role, plus the other role's page while the user still owns rows there
 * (someone who switched role can still manage their old requests or offers).
 */
export function navTabs(role: NavRole | null, owns: { hasRequests: boolean; hasOffers: boolean }): NavTab[] {
  if (role === null) {
    return [
      { href: '/tutors', label: 'Find tutors' },
      { href: '/requests', label: 'Request board' },
    ];
  }

  if (role === 'tutor') {
    return [
      { href: '/main/dashboard', label: 'Dashboard' },
      { href: '/requests', label: 'Request board' },
      MY_OFFERS,
      ...(owns.hasRequests ? [MY_REQUESTS] : []),
    ];
  }

  return [
    { href: '/main/dashboard', label: 'Dashboard' },
    { href: '/tutors', label: 'Find tutors' },
    MY_REQUESTS,
    ...(owns.hasOffers ? [MY_OFFERS] : []),
  ];
}

/** Account pages, shown in the menu under the avatar rather than as tabs. */
export function accountMenu(role: NavRole): { href: string; label: string }[] {
  return [
    ...(role === 'tutor' ? [{ href: '/main/tutor-profile', label: 'Tutor profile' }] : []),
    { href: '/main/profile', label: 'Profile' },
    { href: '/main/settings', label: 'Settings' },
  ];
}
