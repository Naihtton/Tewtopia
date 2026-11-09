'use client';

import { useState } from 'react';
import type { UserSettings } from '@/lib/settings';
import { ui } from '@/lib/ui';

type SettingsFormProps = {
  initialSettings: UserSettings;
  initialError: string | null;
};

type SettingsState = {
  emailNotifications: boolean;
  sessionReminders: boolean;
  marketingEmails: boolean;
  profileVisibility: UserSettings['profileVisibility'];
  documentAccess: UserSettings['documentAccess'];
  autoShareDocuments: boolean;
  updatedAt: string | null;
};

function toFormState(settings: UserSettings): SettingsState {
  return {
    emailNotifications: settings.emailNotifications,
    sessionReminders: settings.sessionReminders,
    marketingEmails: settings.marketingEmails,
    profileVisibility: settings.profileVisibility,
    documentAccess: settings.documentAccess,
    autoShareDocuments: settings.autoShareDocuments,
    updatedAt: settings.updatedAt,
  };
}

const visibilityHelp: Record<UserSettings['profileVisibility'], string> = {
  private: 'Only you can access your profile details.',
  matched_only: 'Visible after you are matched with another user.',
  public: 'Visible in public tutor discovery when applicable.',
};

const documentHelp: Record<UserSettings['documentAccess'], string> = {
  private: 'Files stay private until you share them manually.',
  tutors_only: 'Shared by default with your tutor connections.',
  matched_users: 'Shared with users matched to your account.',
};

function ToggleField({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`${ui.asideCard} flex items-start justify-between gap-4 ring-1 ring-line`}>
      <div>
        <p className="font-medium text-ink">{label}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-line accent-cta"
      />
    </label>
  );
}

export function SettingsForm({ initialSettings, initialError }: SettingsFormProps) {
  const [settings, setSettings] = useState<SettingsState>(() => toFormState(initialSettings));
  const [error, setError] = useState<string | null>(initialError);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = (await response.json()) as {
        error?: string;
        settings?: {
          email_notifications: boolean;
          session_reminders: boolean;
          marketing_emails: boolean;
          profile_visibility: UserSettings['profileVisibility'];
          document_access: UserSettings['documentAccess'];
          auto_share_documents: boolean;
          updated_at: string | null;
        };
      };

      if (!response.ok || !data.settings) {
        setError(data.error ?? 'Unable to save settings.');
        return;
      }

      setSettings({
        emailNotifications: data.settings.email_notifications,
        sessionReminders: data.settings.session_reminders,
        marketingEmails: data.settings.marketing_emails,
        profileVisibility: data.settings.profile_visibility,
        documentAccess: data.settings.document_access,
        autoShareDocuments: data.settings.auto_share_documents,
        updatedAt: data.settings.updated_at,
      });
      setSavedMessage('Settings saved.');
    } catch {
      setError('Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className={`${ui.title} text-4xl md:text-5xl`}>Settings</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">Configure notifications, privacy, and document sharing behavior.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={ui.chip}>
            Visibility: {settings.profileVisibility.replace('_', ' ')}
          </span>
          <span className={ui.chip}>
            Documents: {settings.documentAccess.replace('_', ' ')}
          </span>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {savedMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
        <form onSubmit={handleSubmit} className={`${ui.panel} space-y-6 p-6`}>
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Notifications</h2>
              <p className="mt-1 text-sm text-muted">
                Choose which reminders and email updates you want to receive.
              </p>
            </div>
            <ToggleField
              checked={settings.emailNotifications}
              label="Email notifications"
              description="Receive general account and activity updates by email."
              onChange={(value) => setSettings((current) => ({ ...current, emailNotifications: value }))}
            />
            <ToggleField
              checked={settings.sessionReminders}
              label="Session reminders"
              description="Get reminded before upcoming learning sessions and feedback deadlines."
              onChange={(value) => setSettings((current) => ({ ...current, sessionReminders: value }))}
            />
            <ToggleField
              checked={settings.marketingEmails}
              label="Product updates"
              description="Receive optional news about new tutoring features and platform updates."
              onChange={(value) => setSettings((current) => ({ ...current, marketingEmails: value }))}
            />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Privacy</h2>
              <p className="mt-1 text-sm text-muted">Control who can discover and view your profile details.</p>
            </div>
            <div>
              <label className={ui.label} htmlFor="profileVisibility">
                Profile visibility
              </label>
              <select
                id="profileVisibility"
                value={settings.profileVisibility}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    profileVisibility: event.target.value as UserSettings['profileVisibility'],
                  }))
                }
                className={ui.input}
              >
                <option value="private">Private</option>
                <option value="matched_only">Matched users only</option>
                <option value="public">Public</option>
              </select>
              <p className={ui.helper}>{visibilityHelp[settings.profileVisibility]}</p>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Documents</h2>
              <p className="mt-1 text-sm text-muted">Set default access rules for shared learning materials.</p>
            </div>
            <div>
              <label className={ui.label} htmlFor="documentAccess">
                Default document access
              </label>
              <select
                id="documentAccess"
                value={settings.documentAccess}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    documentAccess: event.target.value as UserSettings['documentAccess'],
                  }))
                }
                className={ui.input}
              >
                <option value="private">Private</option>
                <option value="tutors_only">Tutors only</option>
                <option value="matched_users">Matched users</option>
              </select>
              <p className={ui.helper}>{documentHelp[settings.documentAccess]}</p>
            </div>
            <ToggleField
              checked={settings.autoShareDocuments}
              label="Auto-share new documents"
              description="Automatically apply your default sharing rule to newly uploaded files."
              onChange={(value) => setSettings((current) => ({ ...current, autoShareDocuments: value }))}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`${ui.buttonPrimary} disabled:cursor-not-allowed`}
            >
              {isSaving ? 'Saving...' : 'Save settings'}
            </button>
            <p className="text-sm text-muted">Use public visibility only if you want students to discover your tutor card.</p>
          </div>
        </form>

        <aside className={`${ui.panel} space-y-4 p-5`}>
          <div>
            <h2 className={`${ui.title} text-2xl`}>Current summary</h2>
            <p className="mt-1 text-sm text-muted">Preview of the active settings stored for your account.</p>
          </div>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted">Quick summary</dt>
              <dd className="font-medium text-ink">{visibilityHelp[settings.profileVisibility]}</dd>
            </div>
            <div>
              <dt className="text-muted">Email notifications</dt>
              <dd className="font-medium text-ink">{settings.emailNotifications ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt className="text-muted">Session reminders</dt>
              <dd className="font-medium text-ink">{settings.sessionReminders ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt className="text-muted">Product updates</dt>
              <dd className="font-medium text-ink">{settings.marketingEmails ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt className="text-muted">Profile visibility</dt>
              <dd className="font-medium capitalize text-ink">
                {settings.profileVisibility.replace('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Document access</dt>
              <dd className="font-medium capitalize text-ink">
                {settings.documentAccess.replace('_', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Auto-share documents</dt>
              <dd className="font-medium text-ink">{settings.autoShareDocuments ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div>
              <dt className="text-muted">Last updated</dt>
              <dd className="font-medium text-ink">
                {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Not saved yet'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
