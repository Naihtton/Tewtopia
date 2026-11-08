'use client';

import { useState } from 'react';
import { LogoutButton } from '@/app/main/_components/logout-button';
import { MainSidebar } from '@/app/main/_components/main-sidebar';
import type { UserRole, UserProfile } from '@/lib/profiles';
import { ui } from '@/lib/ui';

type MainShellProps = {
  children: React.ReactNode;
  username: string;
  role: UserRole;
  status: UserProfile['status'];
};

export function MainShell({ children, username, role, status }: MainShellProps) {
  const [open, setOpen] = useState(true);
  const statusLabel = status === 'profile_ready' ? 'Profile ready' : 'Complete your profile';
  const workspaceLabel = role === 'tutor' ? 'Teaching workspace' : 'Learning workspace';

  return (
    <div className={`${ui.shell} flex`}>
      <MainSidebar open={open} onToggle={() => setOpen(!open)} role={role} />
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/70 to-transparent" />
        <header className="relative px-6 py-5 md:px-8">
          <div className={`${ui.heroPanel} mx-auto flex max-w-7xl items-start justify-between gap-4`}>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-400">{workspaceLabel}</p>
              <p className={`${ui.title} mt-2 text-4xl md:text-5xl`}>{username}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`${ui.chip} capitalize`}>{role}</span>
                <span className={ui.chipAccent}>{statusLabel}</span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="relative flex flex-1 px-6 pb-8 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
