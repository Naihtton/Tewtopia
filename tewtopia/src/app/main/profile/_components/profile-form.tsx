'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UserProfile, UserRole } from '@/lib/profiles';
import type { TutorChecklist } from '@/lib/tutor-listing';
import { ui } from '@/lib/ui';

type ProfileFormProps = {
  initialProfile: UserProfile;
  initialError: string | null;
  // Only for tutors: the Find tutors listing checklist from saved data.
  tutorChecklist: TutorChecklist | null;
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

export function ProfileForm({ initialProfile, initialError, tutorChecklist }: ProfileFormProps) {
  const router = useRouter();
  // Tutors: "ready" means listed on Find tutors (from saved data), not just a basic profile.
  const tutorStepsDone = tutorChecklist?.filter((item) => item.done).length ?? 0;
  const tutorListed = tutorChecklist !== null && tutorStepsDone === tutorChecklist.length;
  const tutorMissing = tutorChecklist?.filter((item) => !item.done).map((item) => item.label) ?? [];
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
      // Re-read server data so the tutor listing status reflects the save.
      router.refresh();
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
        <p className="mt-3 max-w-2xl text-base text-muted">Manage account details, role information, and tutor preferences.</p>
        <div className={`${ui.chipAccent} mt-5`}>
          {tutorChecklist
            ? `Find tutors: ${tutorStepsDone}/${tutorChecklist.length} steps`
            : `Setup progress: ${completedCount}/4`}
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
            <p className="mb-2 block text-sm font-medium text-ink-soft">Role</p>
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
                      ? 'border-primary bg-primary-soft'
                      : 'border-line hover:border-primary/50 hover:bg-cream'
                  }`}
                >
                  <p className="font-semibold text-ink">{option.label}</p>
                  <p className="mt-1 text-sm text-muted">{option.description}</p>
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
              className={`${ui.buttonPrimary} disabled:cursor-not-allowed`}
            >
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
            <p className="text-sm text-muted">
              {profile.role === 'tutor'
                ? 'Then finish your Tutor Profile (rate, levels, contact) to appear on Find tutors.'
                : 'Keep your subjects updated so tutor matching feels relevant.'}
            </p>
          </div>
        </form>

        <aside className={`${ui.panel} space-y-4 p-5`}>
          <div>
            <h2 className={`${ui.title} text-2xl`}>Account Snapshot</h2>
            <p className="mt-1 text-sm text-muted">Live summary of the current profile state.</p>
          </div>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted">Next recommended step</dt>
              <dd className="font-medium text-ink">
                {profile.role === 'tutor' ? 'Open Tutor Profile after saving.' : 'Browse tutors after saving.'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium text-ink">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Display name</dt>
              <dd className="font-medium text-ink">{profile.displayName || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted">Role</dt>
              <dd className="font-medium capitalize text-ink">{profile.role}</dd>
            </div>
            <div>
              <dt className="text-muted">Preferred subjects</dt>
              <dd className="font-medium text-ink">{profile.preferredSubjects || 'None yet'}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              {tutorChecklist ? (
                tutorListed ? (
                  <dd className="font-medium text-emerald-700">Visible on Find tutors</dd>
                ) : (
                  <dd className="font-medium text-primary-deep">
                    Not on Find tutors yet — still needed: {tutorMissing.join(', ').toLowerCase()}.{' '}
                    <Link href="/main/tutor-profile" className="font-bold underline underline-offset-2">
                      Open Tutor Profile
                    </Link>
                  </dd>
                )
              ) : (
                <dd className={`font-medium ${profile.status === 'profile_ready' ? 'text-emerald-700' : 'text-muted'}`}>
                  {profile.status === 'profile_ready' ? 'Profile ready' : 'Profile incomplete'}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-muted">Last updated</dt>
              <dd className="font-medium text-ink">
                {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Not saved yet'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
