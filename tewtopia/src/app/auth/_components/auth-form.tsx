'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthFormProps = {
  isConfigured: boolean;
};

export function AuthForm({ isConfigured }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      setError('Add your Supabase environment variables before signing in.');
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/main/dashboard');
      router.refresh();
    } catch {
      setError('Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border border-gray-300 p-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border border-gray-300 p-2"
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isConfigured && (
        <p className="text-sm text-amber-700">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
        </p>
      )}
      <button
        type="submit"
        disabled={!isConfigured || isSubmitting}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isSubmitting ? 'Signing in...' : 'Log In'}
      </button>
    </form>
  );
}
