'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { postAuthDestination, type AuthMode, type SignupRole } from '@/lib/auth-redirect';
import { createClient } from '@/lib/supabase/client';
import { ui } from '@/lib/ui';

type AuthFormProps = {
  isConfigured: boolean;
  // Already sanitized by the page with safeNextPath.
  next: string | null;
  initialMode: AuthMode;
};

const roleOptions: { value: SignupRole; title: string; description: string }[] = [
  { value: 'student', title: "I'm a student", description: 'Find tutors and get help with your subjects.' },
  { value: 'tutor', title: "I'm a tutor", description: 'Create a tutor profile and get found by students.' },
];

export function AuthForm({ isConfigured, next, initialMode }: AuthFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<SignupRole | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [checkEmail, setCheckEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(undefined);
    // Keep `next` in the URL so a refresh or shared link stays on the same flow.
    const params = new URLSearchParams();
    if (nextMode === 'signup') params.set('mode', 'signup');
    if (next) params.set('next', next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isConfigured) {
      setError('Add your Supabase environment variables before signing in.');
      return;
    }

    if (mode === 'signup' && !role) {
      setError('Choose whether you are a student or a tutor.');
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push(postAuthDestination({ next, mode: 'login', role: 'student' }));
        router.refresh();
        return;
      }

      const signupRole = role as SignupRole;
      const destination = postAuthDestination({ next, mode: 'signup', role: signupRole });
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: signupRole, display_name: displayName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Email confirmation off → signed in now. On → no session until the link is clicked.
      if (data.session) {
        router.push(destination);
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } catch {
      setError(mode === 'login' ? 'Unable to sign in.' : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
        Check your email to confirm your account, then come back to log in.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Account type</legend>
            {roleOptions.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-[1.25rem] border p-4 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                  role === option.value
                    ? 'border-primary bg-primary-soft'
                    : 'border-line hover:border-primary/50 hover:bg-cream'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span className="block font-extrabold text-ink">{option.title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
              </label>
            ))}
          </fieldset>
          <input
            type="text"
            placeholder="Display name"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={ui.input}
            required
          />
        </>
      )}
      <input
        type="email"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={ui.input}
        required
      />
      <input
        type="password"
        placeholder={mode === 'signup' ? 'Password (at least 8 characters)' : 'Password'}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        minLength={mode === 'signup' ? 8 : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={ui.input}
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!isConfigured && (
        <p className="text-sm text-amber-800">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
        </p>
      )}
      <button
        type="submit"
        disabled={!isConfigured || isSubmitting}
        className={`${ui.buttonPrimary} w-full disabled:cursor-not-allowed`}
      >
        {isSubmitting
          ? mode === 'login'
            ? 'Signing in...'
            : 'Creating account...'
          : mode === 'login'
            ? 'Log in'
            : 'Create account'}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          className="font-bold text-primary-deep underline-offset-2 hover:underline"
        >
          {mode === 'login' ? 'Create one' : 'Log in'}
        </button>
      </p>
    </form>
  );
}
