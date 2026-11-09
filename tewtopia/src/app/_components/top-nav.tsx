'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/app/main/_components/logout-button';
import type { UserRole } from '@/lib/profiles';
import { ui } from '@/lib/ui';

export type NavUser = {
  name: string;
  role: UserRole;
};

type TopNavProps = {
  // null = signed-out visitor: only the logo and "Log in" are shown.
  user: NavUser | null;
};

function tabsFor(role: UserRole) {
  return [
    { href: '/main/dashboard', label: 'Dashboard' },
    role === 'tutor'
      ? { href: '/main/tutor-profile', label: 'Tutor profile' }
      : { href: '/main/tutors', label: 'Find tutors' },
    { href: '/main/profile', label: 'Profile' },
    { href: '/main/settings', label: 'Settings' },
  ];
}

function ctaFor(role: UserRole) {
  return role === 'tutor'
    ? { href: '/main/tutor-profile', label: 'Edit tutor profile' }
    : { href: '/main/tutors', label: 'Find a tutor' };
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const tabs = user ? tabsFor(user.role) : [];
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
              <span
                title={user.name}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold uppercase text-primary-deep"
              >
                {user.name.slice(0, 1)}
              </span>
              <LogoutButton />
            </>
          ) : pathname === '/auth' ? null : (
            <Link href="/auth" className={ui.buttonSecondary}>
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
