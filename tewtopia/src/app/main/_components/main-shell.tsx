import { TopNav, type NavUser } from '@/app/_components/top-nav';
import type { UserRole } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';
import { ui } from '@/lib/ui';

type MainShellProps = {
  children: React.ReactNode;
  username: string;
  role: UserRole;
};

async function navState(): Promise<Pick<NavUser, 'badges' | 'owns'>> {
  const supabase = await createClient();
  const [{ data: counts }, { data: auth }] = await Promise.all([
    supabase.rpc('my_attention_counts'),
    supabase.auth.getUser(),
  ]);
  const row = Array.isArray(counts) ? counts[0] : null;
  const userId = auth.user?.id ?? '';
  // RLS limits both to the user's own rows; head-only counts, no data transferred.
  const [{ count: requestCount }, { count: offerCount }] = await Promise.all([
    supabase.from('student_requests').select('id', { count: 'exact', head: true }).eq('student_user_id', userId),
    supabase.from('request_offers').select('id', { count: 'exact', head: true }).eq('tutor_user_id', userId),
  ]);

  return {
    badges: { pendingOffers: row?.pending_offers ?? 0, acceptedOffers: row?.accepted_offers ?? 0 },
    owns: { hasRequests: (requestCount ?? 0) > 0, hasOffers: (offerCount ?? 0) > 0 },
  };
}

export async function MainShell({ children, username, role }: MainShellProps) {
  const state = await navState();

  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={{ name: username, role, ...state }} />
      <main className="flex flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
