import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  parseCommaSeparatedList,
  syncRoleSubjects,
  syncUserRole,
} from '@/lib/profile-sync';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/profiles';

function parseStatus(displayName: string, preferredSubjects: string[]) {
  if (displayName.trim().length > 0 && preferredSubjects.length > 0) {
    return 'profile_ready';
  }

  return 'profile_incomplete';
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, preferred_subjects, bio, status, updated_at')
    .eq('id', sessionUser.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: data ?? {
      id: sessionUser.id,
      email: sessionUser.email,
      display_name: '',
      role: 'student',
      preferred_subjects: [],
      bio: '',
      status: 'profile_incomplete',
      updated_at: null,
    },
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    displayName?: unknown;
    role?: unknown;
    preferredSubjects?: unknown;
    bio?: unknown;
  };

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const role: UserRole = body.role === 'tutor' ? 'tutor' : 'student';
  const preferredSubjects = parseCommaSeparatedList(body.preferredSubjects);
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  const status = parseStatus(displayName, preferredSubjects);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: sessionUser.id,
        email: sessionUser.email,
        display_name: displayName,
        role,
        preferred_subjects: preferredSubjects,
        bio,
        status,
      },
      { onConflict: 'id' },
    )
    .select('id, email, display_name, role, preferred_subjects, bio, status, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await syncUserRole(supabase, sessionUser.id, role);
    await syncRoleSubjects(supabase, sessionUser.id, role, preferredSubjects);
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'Unable to sync normalized profile data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
