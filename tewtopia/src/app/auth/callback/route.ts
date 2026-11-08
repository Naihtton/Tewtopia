import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/auth-redirect';
import { createClient } from '@/lib/supabase/server';

// Target of the sign-up confirmation email (only used when Supabase email
// confirmation is on). Exchanges the one-time code for a session cookie.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next')) ?? '/main/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/auth?error=confirm', request.url));
}
