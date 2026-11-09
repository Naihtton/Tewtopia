import { redirect } from 'next/navigation';
import { TopNav } from '@/app/_components/top-nav';
import { AuthForm } from '@/app/auth/_components/auth-form';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ui } from '@/lib/ui';

export default async function AuthPage() {
  const sessionUser = await getSessionUser();
  const configured = isSupabaseConfigured();

  if (sessionUser) {
    redirect('/main/dashboard');
  }

  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={null} />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className={`${ui.panel} w-full max-w-md p-8`}>
          <h1 className={`${ui.title} text-center text-3xl`}>Log in</h1>
          <p className="mt-3 mb-6 text-center text-sm leading-6 text-muted">
            Sign in with your email and password to continue to your workspace.
          </p>
          <AuthForm isConfigured={configured} />
        </div>
      </main>
    </div>
  );
}
