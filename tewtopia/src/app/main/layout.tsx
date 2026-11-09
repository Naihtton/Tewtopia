import { redirect } from 'next/navigation';
import { MainShell } from '@/app/main/_components/main-shell';
import { getCurrentUserProfile } from '@/lib/profiles';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const result = await getCurrentUserProfile();

  if (!result) {
    redirect('/auth');
  }

  const username = result.profile.displayName || result.profile.email;

  return (
    <MainShell username={username} role={result.profile.role}>
      {children}
    </MainShell>
  );
}
