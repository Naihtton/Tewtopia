'use client';

import { useState } from 'react';
import type { UserProfile, UserRole } from '@/lib/profiles';
import { ui } from '@/lib/ui';

type ProfileFormProps = {
  initialProfile: UserProfile;
  initialError: string | null;
};

type ProfileState = {
  displayName: string;
  role: UserRole;
  preferredSubjects: string;
  bio: string;
  email: string;
  status: UserProfile['status'];
  updatedAt: string | null;
};

function toFormState(profile: UserProfile): ProfileState {
  return {
    displayName: profile.displayName,
    role: profile.role,
    preferredSubjects: profile.preferredSubjects.join(', '),
    bio: profile.bio,
    email: profile.email,
    status: profile.status,
    updatedAt: profile.updatedAt,
  };
}

const subjectSuggestions = ['Mathematics', 'Physics', 'English', 'Biology', 'Chemistry', 'SAT'];

function addSubject(currentValue: string, subject: string) {
  const items = currentValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.includes(subject)) {
    return currentValue;
  }

  return [...items, subject].join(', ');
}

export function ProfileForm({ initialProfile, initialError }: ProfileFormProps) {
  const [profile, setProfile] = useState<ProfileState>(() => toFormState(initialProfile));
  const [error, setError] = useState<string | null>(initialError);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const completedCount = [
    profile.displayName.trim().length > 0,
    profile.preferredSubjects.trim().length > 0,
    profile.bio.trim().length > 0,
    profile.status === 'profile_ready',
  ].filter(Boolean).length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: profile.displayName,
          role: profile.role,
          preferredSubjects: profile.preferredSubjects,
          bio: profile.bio,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        profile?: {
          email: string;
          display_name: string | null;
          role: UserRole | null;
          preferred_subjects: string[] | null;
          bio: string | null;
          status: UserProfile['status'] | null;
          updated_at: string | null;
        };
      };

      if (!response.ok || !data.profile) {
        setError(data.error ?? 'Unable to save profile.');
        return;
      }

      setProfile((current) => ({
        ...current,
        email: data.profile?.email ?? current.email,
        displayName: data.profile?.display_name ?? '',
        role: data.profile?.role ?? 'student',
        preferredSubjects: (data.profile?.preferred_subjects ?? []).join(', '),
        bio: data.profile?.bio ?? '',
        status: data.profile?.status ?? 'profile_incomplete',
        updatedAt: data.profile?.updated_at ?? null,
      }));
      setSavedMessage('Profile saved.');
    } catch {
      setError('Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className={`${ui.title} text-4xl md:text-5xl`}>Profile</h1>
        <p className="mt-3 max-w-2xl text-base text-stone-500">Manage account details, role information, and tutor preferences.</p>
        <div className={`${ui.chipAccent} mt-5`}>
          Setup progress: {completedCount}/4
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {savedMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(18rem,1fr)]">
        <form onSubmit={handleSubmit} className={`${ui.panel} space-y-6 p-6`}>
          <div>
            <label className={ui.label} htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              value={profile.displayName}
              onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
              className={ui.input}
              placeholder="Your public display name"
            />
          </div>

          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700">Role</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                {
                  value: 'student',
                  label: 'Student',
                  description: 'Browse tutors and manage your learning preferences.',
                },
                {
                  value: 'tutor',
                  label: 'Tutor',
                  description: 'Create a public tutor profile and accept student interest.',
                },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setProfile((current) => ({ ...current, role: option.value as UserRole }))
                  }
                  className={`rounded-[1.25rem] border p-4 text-left transition-colors ${
                    profile.role === option.value
                      ? 'border-stone-950 bg-stone-100'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <p className="font-semibold text-stone-900">{option.label}</p>
                  <p className="mt-1 text-sm text-stone-500">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={ui.label} htmlFor="preferredSubjects">
              Preferred subjects
            </label>
            <input
              id="preferredSubjects"
              value={profile.preferredSubjects}
              onChange={(event) =>
                setProfile((current) => ({ ...current, preferredSubjects: event.target.value }))
              }
              className={ui.input}
              placeholder="Mathematics, Physics, English"
            />
            <p className={ui.helper}>Separate multiple subjects with commas.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {subjectSuggestions.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() =>
                    setProfile((current) => ({
                      ...current,
                      preferredSubjects: addSubject(current.preferredSubjects, subject),
                    }))
                  }
                  className={ui.chip}
                >
                  + {subject}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={ui.label} htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
              className={ui.textarea}
              placeholder="Tell students or tutors what you are looking for."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`${ui.buttonPrimary} disabled:cursor-not-allowed disabled:bg-stone-400`}
            >
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
            <p className="text-sm text-stone-500">
              {profile.role === 'tutor'
                ? 'After this, complete Tutor Profile to appear ready for students.'
                : 'Keep your subjects updated so tutor matching feels relevant.'}
            </p>
          </div>
        </form>

        <aside className={`${ui.panel} space-y-4 p-5`}>
          <div>
            <h2 className={`${ui.title} text-2xl`}>Account Snapshot</h2>
            <p className="mt-1 text-sm text-stone-500">Live summary of the current profile state.</p>
          </div>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-stone-500">Next recommended step</dt>
              <dd className="font-medium text-stone-900">
                {profile.role === 'tutor' ? 'Open Tutor Profile after saving.' : 'Browse tutors after saving.'}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Email</dt>
              <dd className="font-medium text-stone-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Display name</dt>
              <dd className="font-medium text-stone-900">{profile.displayName || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Role</dt>
              <dd className="font-medium capitalize text-stone-900">{profile.role}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Preferred subjects</dt>
              <dd className="font-medium text-stone-900">{profile.preferredSubjects || 'None yet'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Status</dt>
              <dd className="font-medium text-emerald-700">
                {profile.status === 'profile_ready' ? 'Profile ready' : 'Profile incomplete'}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Last updated</dt>
              <dd className="font-medium text-stone-900">
                {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Not saved yet'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
