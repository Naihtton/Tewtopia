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

  // URL parsing silently strips tab/CR/LF, so "/\t/evil.com" would become
  // "//evil.com". Reject spaces and control characters outright.
  if (value[1] === '/' || value.includes('\\') || /[\u0000- \u007f]/.test(value)) {
    return null;
  }

  // Belt and braces: it must still resolve to the same origin.
  const base = 'http://tewtopia.invalid';
  try {
    if (new URL(value, base).origin !== base) {
      return null;
    }
  } catch {
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

export type AuthCallback =
  | { kind: 'otp'; tokenHash: string; type: 'signup' | 'email'; next: string }
  | { kind: 'code'; code: string; next: string }
  | { kind: 'invalid'; next: string };

/**
 * Reads the email-confirmation link. `token_hash` + `type` (Supabase's
 * recommended SSR email template) works when the link is opened on another
 * device; `code` (PKCE) only works in the browser that signed up.
 */
export function parseAuthCallback(params: URLSearchParams): AuthCallback {
  const next = safeNextPath(params.get('next')) ?? '/main/dashboard';
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const code = params.get('code');

  if (tokenHash) {
    return type === 'signup' || type === 'email' ? { kind: 'otp', tokenHash, type, next } : { kind: 'invalid', next };
  }

  if (code) {
    return { kind: 'code', code, next };
  }

  return { kind: 'invalid', next };
}
