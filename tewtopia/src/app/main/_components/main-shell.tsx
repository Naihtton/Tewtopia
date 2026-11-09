import { TopNav } from '@/app/_components/top-nav';
import type { UserRole } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';
import { ui } from '@/lib/ui';

type MainShellProps = {
  children: React.ReactNode;
  username: string;
  role: UserRole;
};

async function attentionCount(role: UserRole) {
  const { data } = await (await createClient()).rpc('my_attention_counts');
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return 0;
  return role === 'tutor' ? row.accepted_offers : row.pending_offers;
}

export async function MainShell({ children, username, role }: MainShellProps) {
  const badge = await attentionCount(role);

  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={{ name: username, role, badge }} />
      <main className="flex flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
