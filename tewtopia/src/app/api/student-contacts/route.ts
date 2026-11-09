import { NextResponse } from 'next/server';
import { normalizeContactDetails } from '@/lib/contact';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// Saves the signed-in student's contact channels (student_profiles, own row via RLS).
// Used by the Profile page and by the post-a-request form.
export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { contacts?: unknown };
  const contacts = normalizeContactDetails(body.contacts);

  const supabase = await createClient();
  const { error } = await supabase.from('student_profiles').upsert(
    {
      user_id: sessionUser.id,
      contact_instagram: contacts.instagram,
      contact_facebook: contacts.facebook,
      contact_phone: contacts.phone,
      contact_line: contacts.line,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts });
}
