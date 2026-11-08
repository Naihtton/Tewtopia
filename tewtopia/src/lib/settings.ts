import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type UserSettings = {
  id: string;
  emailNotifications: boolean;
  sessionReminders: boolean;
  marketingEmails: boolean;
  profileVisibility: 'private' | 'matched_only' | 'public';
  documentAccess: 'private' | 'tutors_only' | 'matched_users';
  autoShareDocuments: boolean;
  updatedAt: string | null;
};

type SettingsRow = {
  id: string;
  email_notifications: boolean | null;
  session_reminders: boolean | null;
  marketing_emails: boolean | null;
  profile_visibility: UserSettings['profileVisibility'] | null;
  document_access: UserSettings['documentAccess'] | null;
  auto_share_documents: boolean | null;
  updated_at: string | null;
};

function buildDefaultSettings(user: { id: string }): UserSettings {
  return {
    id: user.id,
    emailNotifications: true,
    sessionReminders: true,
    marketingEmails: false,
    profileVisibility: 'matched_only',
    documentAccess: 'private',
    autoShareDocuments: false,
    updatedAt: null,
  };
}

function mapSettingsRow(row: SettingsRow): UserSettings {
  return {
    id: row.id,
    emailNotifications: row.email_notifications ?? true,
    sessionReminders: row.session_reminders ?? true,
    marketingEmails: row.marketing_emails ?? false,
    profileVisibility: row.profile_visibility ?? 'matched_only',
    documentAccess: row.document_access ?? 'private',
    autoShareDocuments: row.auto_share_documents ?? false,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentUserSettings() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select(
      'id, email_notifications, session_reminders, marketing_emails, profile_visibility, document_access, auto_share_documents, updated_at',
    )
    .eq('id', sessionUser.id)
    .maybeSingle<SettingsRow>();

  if (error) {
    return {
      settings: buildDefaultSettings(sessionUser),
      error: error.message,
    };
  }

  if (!data) {
    return {
      settings: buildDefaultSettings(sessionUser),
      error: null,
    };
  }

  return {
    settings: mapSettingsRow(data),
    error: null,
  };
}
