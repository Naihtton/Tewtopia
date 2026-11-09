'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/app/_components/avatar';
import { LogoutButton } from '@/app/main/_components/logout-button';
import { accountMenu, type NavRole } from '@/lib/nav-tabs';

const itemClass =
  'block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-soft transition-colors hover:bg-cream hover:text-ink';

/** The avatar in the top nav: opens Profile / Settings (and Tutor profile) / Log out. */
export function AccountMenu({ name, role, avatarUrl }: { name: string; role: NavRole; avatarUrl: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = accountMenu(role);
  const onAccountPage = items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  // Close on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className={`shrink-0 rounded-full outline-none transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary ${
          onAccountPage || open ? 'ring-2 ring-primary' : ''
        }`}
      >
        <Avatar name={name} url={avatarUrl} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(46,36,51,0.14)]"
        >
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate text-sm font-extrabold text-ink">{name}</p>
            <p className="text-xs capitalize text-muted">{role}</p>
          </div>
          <div className="py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`${itemClass} ${pathname === item.href ? 'bg-primary-soft text-primary-deep' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-line pt-1">
            <LogoutButton className={`${itemClass} disabled:cursor-not-allowed disabled:opacity-60`} />
          </div>
        </div>
      )}
    </div>
  );
}
