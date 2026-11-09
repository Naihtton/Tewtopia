import { TopNav } from '@/app/_components/top-nav';
import type { UserRole } from '@/lib/profiles';
import { ui } from '@/lib/ui';

type MainShellProps = {
  children: React.ReactNode;
  username: string;
  role: UserRole;
};

export function MainShell({ children, username, role }: MainShellProps) {
  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={{ name: username, role }} />
      <main className="flex flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
