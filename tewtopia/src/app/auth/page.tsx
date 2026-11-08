import { redirect } from 'next/navigation';
import { AuthForm } from '@/app/auth/_components/auth-form';
import { getSessionUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default async function AuthPage() {
  const sessionUser = await getSessionUser();
  const configured = isSupabaseConfigured();

  if (sessionUser) {
    redirect('/main/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Log In</h1>
        <p className="mb-4 text-sm text-gray-600">
          Sign in with a Supabase email/password account to access the main workspace.
        </p>
        <AuthForm isConfigured={configured} />
      </div>
    </main>
  );
}
