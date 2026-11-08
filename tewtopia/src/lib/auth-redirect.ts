// Pure helpers (no `@/` imports) so `node --test` can load them directly.

export type AuthMode = 'login' | 'signup';
export type SignupRole = 'student' | 'tutor';

/**
 * Returns `value` only if it is a same-site path, so `?next=` can never
 * send someone to another origin (`//host`, `/\host`, `https://…`, `javascript:`).
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return null;
  }

  if (value[1] === '/' || value.includes('\\')) {
    return null;
  }

  return value;
}

export function postAuthDestination(opts: { next: string | null; mode: AuthMode; role: SignupRole }): string {
  const next = safeNextPath(opts.next);

  if (next) {
    return next;
  }

  if (opts.mode === 'signup') {
    return opts.role === 'tutor' ? '/main/tutor-profile' : '/tutors';
  }

  return '/main/dashboard';
}
