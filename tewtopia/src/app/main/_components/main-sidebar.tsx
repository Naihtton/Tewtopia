'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/profiles';
import { ui } from '@/lib/ui';

type MainSidebarProps = {
  open: boolean;
  onToggle: () => void;
  role: UserRole;
};

export function MainSidebar({ open, onToggle, role }: MainSidebarProps) {
  const pathname = usePathname();
  const links = [
    { href: '/main/dashboard', label: 'Dashboard' },
    { href: '/main/profile', label: 'Profile' },
    ...(role === 'tutor'
      ? [{ href: '/main/tutor-profile', label: 'Tutor Profile' }]
      : [{ href: '/main/tutors', label: 'Browse Tutors' }]),
    { href: '/main/settings', label: 'Settings' },
  ];

  return (
    <aside className={`${open ? 'w-[19rem]' : 'w-24'} relative transition-all duration-300`}>
      <div className="sticky top-0 flex min-h-screen flex-col p-4 md:p-5">
        <div className={`${ui.panel} flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden p-4`}>
          <div className="mb-8 flex items-start justify-between gap-3">
            <div className={`${open ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}>
              <p className={`${ui.title} text-4xl`}>Tewtopia</p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-stone-400">
                Workspace for {role === 'tutor' ? 'teaching' : 'learning'}
              </p>
            </div>
            <button onClick={onToggle} className={`${ui.buttonSecondary} px-3 py-2`}>
              {open ? 'Hide' : 'Menu'}
            </button>
          </div>

          {open ? (
            <>
              <div className="mb-4 rounded-[1.4rem] bg-stone-950 px-4 py-4 text-stone-50">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
                  {role === 'tutor' ? 'Teach' : 'Learn'}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-200">
                  {role === 'tutor'
                    ? 'Shape a public tutor card, manage visibility, and prepare for student requests.'
                    : 'Set your learning goals, compare tutors, and keep your workspace ready for matching.'}
                </p>
              </div>

              <nav className="space-y-2">
                {links.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group flex items-center justify-between rounded-[1.15rem] px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[var(--accent-soft)] text-[#7d3921] shadow-[inset_0_0_0_1px_rgba(184,92,56,0.12)]'
                          : 'text-stone-600 hover:bg-white hover:text-stone-950'
                      }`}
                    >
                      <span>{link.label}</span>
                      <span
                        className={`h-2 w-2 rounded-full transition-opacity ${
                          isActive ? 'bg-[#b85c38] opacity-100' : 'bg-stone-300 opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto rounded-[1.4rem] bg-[linear-gradient(135deg,#f5e6d8,#fff6ef)] p-4 text-stone-800">
                <p className="text-sm font-semibold text-stone-900">
                  {role === 'tutor' ? 'Discovery matters' : 'Keep preferences fresh'}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {role === 'tutor'
                    ? 'Complete your profile and switch visibility to public to appear in tutor browse.'
                    : 'Your subject list and profile status shape what the platform can recommend next.'}
                </p>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 flex-col items-center gap-3">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isActive ? 'bg-stone-950 text-stone-50' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {link.label.slice(0, 1)}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
