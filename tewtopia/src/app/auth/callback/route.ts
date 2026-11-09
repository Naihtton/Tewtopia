import { NextResponse } from 'next/server';
import { parseAuthCallback } from '@/lib/auth-redirect';
import { createClient } from '@/lib/supabase/server';

// Target of the sign-up confirmation email (only used when Supabase email
// confirmation is on). Turns the link into a session cookie, then continues.
export async function GET(request: Request) {
  const callback = parseAuthCallback(new URL(request.url).searchParams);

  if (callback.kind !== 'invalid') {
    const supabase = await createClient();
    const { error } =
      callback.kind === 'otp'
        ? await supabase.auth.verifyOtp({ token_hash: callback.tokenHash, type: callback.type })
        : await supabase.auth.exchangeCodeForSession(callback.code);

    if (!error) {
      return NextResponse.redirect(new URL(callback.next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/auth?error=confirm', request.url));
}
