'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccountMenu } from '@/app/_components/account-menu';
import { navTabs, type NavBadge } from '@/lib/nav-tabs';
import type { UserRole } from '@/lib/profiles';
import { ui } from '@/lib/ui';

export type NavUser = {
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  // Things waiting on this user, per page.
  badges: Record<NavBadge, number>;
  // Rows the user owns regardless of current role (keeps pages reachable after a role switch).
  owns: { hasRequests: boolean; hasOffers: boolean };
};

type TopNavProps = {
  // null = signed-out visitor: only the logo and "Log in" are shown.
  user: NavUser | null;
};

function ctaFor(role: UserRole) {
  return role === 'tutor'
    ? { href: '/main/tutor-profile', label: 'Edit tutor profile' }
    : { href: '/main/requests/new', label: 'Post a request' };
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const tabs = navTabs(user?.role ?? null, user?.owns ?? { hasRequests: false, hasOffers: false });
  // Come back to this page after logging in (the home page falls back to the default).
  const loginHref = pathname === '/' ? '/auth' : `/auth?next=${encodeURIComponent(pathname)}`;
  const cta = user ? ctaFor(user.role) : null;

  const tabLinks = tabs.map((tab) => {
    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

    return (
      <Link
        key={tab.href}
        href={tab.href}
        aria-current={isActive ? 'page' : undefined}
        className={`shrink-0 border-b-[3px] px-1 py-4 text-[0.95rem] transition-colors ${
          isActive
            ? 'border-primary font-extrabold text-primary-deep'
            : 'border-transparent font-semibold text-muted hover:text-ink'
        }`}
      >
        {tab.label}
        {tab.badge && user && user.badges[tab.badge] > 0 && (
          <span
            aria-label={`${user.badges[tab.badge]} need attention`}
            className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-[0.7rem] font-extrabold leading-5 text-white"
          >
            {user.badges[tab.badge]}
          </span>
        )}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 md:px-8">
        <Link href={user ? '/main/dashboard' : '/'} className="py-3 text-2xl font-extrabold text-primary">
          Tewtopia
        </Link>

        {/* Desktop tabs sit inline; on small screens they move to the scroll row below. */}
        <nav aria-label="Main" className="hidden flex-1 items-center gap-6 md:flex">
          {tabLinks}
        </nav>

        <div className="ml-auto flex items-center gap-3 py-3 md:ml-0">
          {user ? (
            <>
              {cta && (
                <Link href={cta.href} className={`${ui.buttonPrimary} hidden sm:inline-flex`}>
                  {cta.label}
                </Link>
              )}
              <AccountMenu name={user.name} role={user.role} avatarUrl={user.avatarUrl} />
            </>
          ) : pathname === '/auth' ? null : (
            <Link href={loginHref} className={ui.buttonSecondary}>
              Log in
            </Link>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <nav
          aria-label="Main"
          className="flex gap-5 overflow-x-auto border-t border-line px-4 [scrollbar-width:none] md:hidden"
        >
          {tabLinks}
        </nav>
      )}
    </header>
  );
}
