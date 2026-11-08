'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { UserProfile } from '@/lib/profiles';
import type { TutorProfile } from '@/lib/tutor-profiles';
import {
  missingTutorFields,
  normalizeTeachingLevels,
  TEACHING_LEVELS,
  type TeachingLevel,
} from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

type TutorProfileFormProps = {
  profile: UserProfile;
  tutorProfile: TutorProfile;
  initialError: string | null;
};

type TutorProfileState = {
  headline: string;
  hourlyRate: string;
  yearsExperience: string;
  teachingModes: string;
  teachingLevels: TeachingLevel[];
  about: string;
  updatedAt: string | null;
};

function toFormState(tutorProfile: TutorProfile): TutorProfileState {
  return {
    headline: tutorProfile.headline,
    hourlyRate: tutorProfile.hourlyRate?.toString() ?? '',
    yearsExperience: tutorProfile.yearsExperience?.toString() ?? '',
    teachingModes: tutorProfile.teachingModes.join(', '),
    teachingLevels: tutorProfile.teachingLevels,
    about: tutorProfile.about,
    updatedAt: tutorProfile.updatedAt,
  };
}

// Keep in sync with tutor_teaching_modes.mode (online, in_person, group, hybrid).
const teachingModeSuggestions = ['Online', 'In person', 'Group class', 'Hybrid'];

function addMode(currentValue: string, mode: string) {
  const items = currentValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.includes(mode)) {
    return currentValue;
  }

  return [...items, mode].join(', ');
}

export function TutorProfileForm({ profile, tutorProfile, initialError }: TutorProfileFormProps) {
  const [form, setForm] = useState<TutorProfileState>(() => toFormState(tutorProfile));
  const [error, setError] = useState<string | null>(initialError);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Mirrors the public_tutor_cards view, using what is currently on screen.
  const missing = missingTutorFields({
    displayName: profile.displayName,
    hourlyRate: form.hourlyRate.trim() === '' ? null : Number(form.hourlyRate),
    subjects: profile.preferredSubjects,
    teachingLevels: form.teachingLevels,
  });
  const missingInProfile = missing.includes('display name') || missing.includes('subjects');

  function toggleLevel(level: TeachingLevel) {
    setForm((current) => ({
      ...current,
      teachingLevels: current.teachingLevels.includes(level)
        ? current.teachingLevels.filter((item) => item !== level)
        : normalizeTeachingLevels([...current.teachingLevels, level]),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/tutor-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as {
        error?: string;
        tutorProfile?: {
          headline: string | null;
          hourly_rate: number | null;
          years_experience: number | null;
          teaching_modes: string[] | null;
          teaching_levels: string[] | null;
          about: string | null;
          updated_at: string | null;
        };
      };

      if (!response.ok || !data.tutorProfile) {
        setError(data.error ?? 'Unable to save tutor profile.');
        return;
      }

      setForm({
        headline: data.tutorProfile.headline ?? '',
        hourlyRate: data.tutorProfile.hourly_rate?.toString() ?? '',
        yearsExperience: data.tutorProfile.years_experience?.toString() ?? '',
        teachingModes: (data.tutorProfile.teaching_modes ?? []).join(', '),
        teachingLevels: normalizeTeachingLevels(data.tutorProfile.teaching_levels),
        about: data.tutorProfile.about ?? '',
        updatedAt: data.tutorProfile.updated_at,
      });
      setSavedMessage('Tutor profile saved.');
    } catch {
      setError('Unable to save tutor profile.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className={`${ui.title} text-4xl md:text-5xl`}>Tutor Profile</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          Build the teaching profile students see on Find tutors.
        </p>
      </div>

      {missing.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Visible to students on Find tutors.
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          <span className="font-bold">Hidden from students</span> — still missing: {missing.join(', ')}.
          {missingInProfile && (
            <>
              {' '}
              <Link href="/main/profile" className="font-bold underline underline-offset-2">
                Edit in Profile
              </Link>
            </>
          )}
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {savedMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
        <form onSubmit={handleSubmit} className={`${ui.panel} space-y-6 p-6`}>
          <div>
            <label htmlFor="headline" className={ui.label}>
              Tutor headline
            </label>
            <input
              id="headline"
              value={form.headline}
              onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))}
              className={ui.input}
              placeholder="IB Math tutor focused on exam confidence and problem solving"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hourlyRate" className={ui.label}>
                Hourly rate
              </label>
              <input
                id="hourlyRate"
                type="number"
                min="0"
                value={form.hourlyRate}
                onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))}
                className={ui.input}
                placeholder="500"
              />
            </div>
            <div>
              <label htmlFor="yearsExperience" className={ui.label}>
                Years of experience
              </label>
              <input
                id="yearsExperience"
                type="number"
                min="0"
                value={form.yearsExperience}
                onChange={(event) =>
                  setForm((current) => ({ ...current, yearsExperience: event.target.value }))
                }
                className={ui.input}
                placeholder="3"
              />
            </div>
          </div>

          <fieldset>
            <legend className={ui.label}>Levels you teach</legend>
            <div className="flex flex-wrap gap-2">
              {TEACHING_LEVELS.map((level) => {
                const checked = form.teachingLevels.includes(level.value);

                return (
                  <label
                    key={level.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      checked ? 'border-primary bg-primary-soft text-primary-deep' : 'border-line bg-white text-ink-soft hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLevel(level.value)}
                      className="h-4 w-4 accent-cta"
                    />
                    {level.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="teachingModes" className={ui.label}>
              Teaching modes
            </label>
            <input
              id="teachingModes"
              value={form.teachingModes}
              onChange={(event) => setForm((current) => ({ ...current, teachingModes: event.target.value }))}
              className={ui.input}
              placeholder="Online, In person, Group class"
            />
            <p className={ui.helper}>Separate multiple modes with commas.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {teachingModeSuggestions.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, teachingModes: addMode(current.teachingModes, mode) }))
                  }
                  className={ui.chip}
                >
                  + {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="about" className={ui.label}>
              About your teaching
            </label>
            <textarea
              id="about"
              value={form.about}
              onChange={(event) => setForm((current) => ({ ...current, about: event.target.value }))}
              className={ui.textarea}
              placeholder="Describe your teaching style, learner fit, and outcomes you focus on."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`${ui.buttonPrimary} disabled:cursor-not-allowed`}
            >
              {isSaving ? 'Saving...' : 'Save tutor profile'}
            </button>
            <p className="text-sm text-muted">You appear on Find tutors once rate, subjects and levels are filled in.</p>
          </div>
        </form>

        <aside className={`${ui.panel} space-y-4 p-5`}>
          <div>
            <h2 className={`${ui.title} text-2xl`}>Public preview</h2>
            <p className="mt-1 text-sm text-muted">
              What students see on your card.
            </p>
          </div>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted">Display name</dt>
              <dd className="font-medium text-ink">{profile.displayName || profile.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Subjects</dt>
              <dd className="font-medium text-ink">
                {profile.preferredSubjects.length > 0 ? profile.preferredSubjects.join(', ') : 'No subjects yet'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Headline</dt>
              <dd className="font-medium text-ink">{form.headline || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted">Rate</dt>
              <dd className="font-medium text-ink">{form.hourlyRate ? `${form.hourlyRate} THB` : 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted">Levels</dt>
              <dd className="font-medium text-ink">
                {form.teachingLevels.length > 0
                  ? TEACHING_LEVELS.filter((level) => form.teachingLevels.includes(level.value))
                      .map((level) => level.label)
                      .join(', ')
                  : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Modes</dt>
              <dd className="font-medium text-ink">{form.teachingModes || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted">Last updated</dt>
              <dd className="font-medium text-ink">
                {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'Not saved yet'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
