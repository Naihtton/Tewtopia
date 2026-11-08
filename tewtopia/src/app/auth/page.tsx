import { redirect } from 'next/navigation';
import { TopNav } from '@/app/_components/top-nav';
import { AuthForm } from '@/app/auth/_components/auth-form';
import { getSessionUser } from '@/lib/auth';
import { safeNextPath } from '@/lib/auth-redirect';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ui } from '@/lib/ui';

type AuthPageProps = {
  searchParams: Promise<{ next?: string; mode?: string; error?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const mode = params.mode === 'signup' ? 'signup' : 'login';
  const sessionUser = await getSessionUser();
  const configured = isSupabaseConfigured();

  if (sessionUser) {
    redirect(next ?? '/main/dashboard');
  }

  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={null} />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className={`${ui.panel} w-full max-w-md p-8`}>
          <h1 className={`${ui.title} text-center text-3xl`}>
            {mode === 'signup' ? 'Create your account' : 'Log in'}
          </h1>
          <p className="mt-3 mb-6 text-center text-sm leading-6 text-muted">
            {mode === 'signup'
              ? 'Browse tutors for free. An account lets you contact them.'
              : 'Sign in with your email and password to continue.'}
          </p>
          {params.error === 'confirm' && (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              That confirmation link is invalid or expired.
            </p>
          )}
          {/* key: remount the form when the mode in the URL changes (e.g. browser back). */}
          <AuthForm key={mode} isConfigured={configured} next={next} initialMode={mode} />
        </div>
      </main>
    </div>
  );
}
