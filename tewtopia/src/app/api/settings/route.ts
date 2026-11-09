import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { UserSettings } from '@/lib/settings';

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function readProfileVisibility(value: unknown): UserSettings['profileVisibility'] {
  if (value === 'private' || value === 'public') {
    return value;
  }

  return 'matched_only';
}

function readDocumentAccess(value: unknown): UserSettings['documentAccess'] {
  if (value === 'tutors_only' || value === 'matched_users') {
    return value;
  }

  return 'private';
}

function buildDefaultSettings(userId: string) {
  return {
    id: userId,
    email_notifications: true,
    session_reminders: true,
    marketing_emails: false,
    profile_visibility: 'matched_only',
    document_access: 'private',
    auto_share_documents: false,
    updated_at: null,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select(
      'id, email_notifications, session_reminders, marketing_emails, profile_visibility, document_access, auto_share_documents, updated_at',
    )
    .eq('id', sessionUser.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: data ?? buildDefaultSettings(sessionUser.id),
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    emailNotifications?: unknown;
    sessionReminders?: unknown;
    marketingEmails?: unknown;
    profileVisibility?: unknown;
    documentAccess?: unknown;
    autoShareDocuments?: unknown;
  };

  const payload = {
    id: sessionUser.id,
    email_notifications: readBoolean(body.emailNotifications, true),
    session_reminders: readBoolean(body.sessionReminders, true),
    marketing_emails: readBoolean(body.marketingEmails, false),
    profile_visibility: readProfileVisibility(body.profileVisibility),
    document_access: readDocumentAccess(body.documentAccess),
    auto_share_documents: readBoolean(body.autoShareDocuments, false),
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'id' })
    .select(
      'id, email_notifications, session_reminders, marketing_emails, profile_visibility, document_access, auto_share_documents, updated_at',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
