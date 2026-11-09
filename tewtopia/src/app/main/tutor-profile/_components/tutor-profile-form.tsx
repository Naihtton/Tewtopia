'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { UserProfile } from '@/lib/profiles';
import {
  CONTACT_CHANNELS,
  hasAnyContact,
  normalizeContactDetails,
  type ContactChannel,
  type ContactDetails,
} from '@/lib/contact';
import { MIN_HOURLY_RATE, parseRateRange, formatRate } from '@/lib/rates';
import type { TutorProfile } from '@/lib/tutor-profiles';
import {
  tutorListingStatus,
  normalizeTeachingLevels,
  TEACHING_LEVELS,
  type TeachingLevel,
} from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

type TutorProfileFormProps = {
  profile: UserProfile;
  tutorProfile: TutorProfile;
  initialError: string | null;
  visibility: string | null;
};

type TutorProfileState = {
  headline: string;
  rateMin: string;
  rateMax: string;
  yearsExperience: string;
  teachingModes: string;
  teachingLevels: TeachingLevel[];
  contacts: ContactDetails;
  about: string;
  updatedAt: string | null;
};

function toFormState(tutorProfile: TutorProfile): TutorProfileState {
  return {
    headline: tutorProfile.headline,
    rateMin: tutorProfile.rateMin?.toString() ?? '',
    rateMax: tutorProfile.rateMax !== null && tutorProfile.rateMax !== tutorProfile.rateMin ? tutorProfile.rateMax.toString() : '',
    yearsExperience: tutorProfile.yearsExperience?.toString() ?? '',
    teachingModes: tutorProfile.teachingModes.join(', '),
    teachingLevels: tutorProfile.teachingLevels,
    contacts: tutorProfile.contacts,
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

export function TutorProfileForm({ profile, tutorProfile, initialError, visibility }: TutorProfileFormProps) {
  const [form, setForm] = useState<TutorProfileState>(() => toFormState(tutorProfile));
  const [error, setError] = useState<string | null>(initialError);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const rateEmpty = form.rateMin.trim() === '' && form.rateMax.trim() === '';
  const rate = parseRateRange(form.rateMin, form.rateMax);
  // Only show an error once they've typed something; empty just means "not set yet".
  const rateError = !rateEmpty && !rate.ok ? rate.error : null;

  // Mirrors the public_tutor_cards view, using what is currently on screen.
  const { listed, missing, hiddenByPrivacy } = tutorListingStatus({
    displayName: profile.displayName,
    rateMin: rate.ok ? rate.min : null,
    rateMax: rate.ok ? rate.max : null,
    subjects: profile.preferredSubjects,
    teachingLevels: form.teachingLevels,
    hasContact: hasAnyContact(normalizeContactDetails(form.contacts)),
    visibility,
  });
  const missingInProfile = missing.includes('display name') || missing.includes('subjects');

  function setContact(channel: ContactChannel, value: string) {
    setForm((current) => ({ ...current, contacts: { ...current.contacts, [channel]: value } }));
  }

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
    if (rateError) {
      setError(rateError);
      return;
    }
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
          hourly_rate_min: number | null;
          hourly_rate_max: number | null;
          years_experience: number | null;
          teaching_modes: string[] | null;
          teaching_levels: string[] | null;
          contact_instagram: string | null;
          contact_facebook: string | null;
          contact_phone: string | null;
          contact_line: string | null;
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
        rateMin: data.tutorProfile.hourly_rate_min?.toString() ?? '',
        rateMax:
          data.tutorProfile.hourly_rate_max !== null && data.tutorProfile.hourly_rate_max !== data.tutorProfile.hourly_rate_min
            ? data.tutorProfile.hourly_rate_max.toString()
            : '',
        yearsExperience: data.tutorProfile.years_experience?.toString() ?? '',
        teachingModes: (data.tutorProfile.teaching_modes ?? []).join(', '),
        teachingLevels: normalizeTeachingLevels(data.tutorProfile.teaching_levels),
        contacts: normalizeContactDetails({
          instagram: data.tutorProfile.contact_instagram,
          facebook: data.tutorProfile.contact_facebook,
          phone: data.tutorProfile.contact_phone,
          line: data.tutorProfile.contact_line,
        }),
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
          Build the teaching profile students see on Find tutors. Your name, subjects and bio are in{' '}
          <Link href="/main/profile" className="font-bold text-primary-deep underline underline-offset-2">
            Profile
          </Link>
          .
        </p>
      </div>

      {listed ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Visible to students on Find tutors.
        </div>
      ) : (
        <div className="space-y-1 rounded-2xl border border-line bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          {missing.length > 0 && (
            <p>
              <span className="font-bold">Hidden from students</span> — still missing: {missing.join(', ')}.
              {missingInProfile && (
                <>
                  {' '}
                  <Link href="/main/profile" className="font-bold underline underline-offset-2">
                    Edit in Profile
                  </Link>
                </>
              )}
            </p>
          )}
          {hiddenByPrivacy && (
            <p>
              <span className="font-bold">Hidden from students</span> — your visibility is set to Private.{' '}
              <Link href="/main/settings" className="font-bold underline underline-offset-2">
                Change in Settings
              </Link>
            </p>
          )}
        </div>
      )}

      {error &&<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
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

          <fieldset>
            <legend className={ui.label}>Hourly rate (THB)</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rateMin" className="mb-1 block text-xs font-bold text-muted">
                  From
                </label>
                <input
                  id="rateMin"
                  type="number"
                  min={MIN_HOURLY_RATE}
                  step={1}
                  value={form.rateMin}
                  onChange={(event) => setForm((current) => ({ ...current, rateMin: event.target.value }))}
                  className={ui.input}
                  placeholder="300"
                />
              </div>
              <div>
                <label htmlFor="rateMax" className="mb-1 block text-xs font-bold text-muted">
                  To (optional)
                </label>
                <input
                  id="rateMax"
                  type="number"
                  min={MIN_HOURLY_RATE}
                  step={1}
                  value={form.rateMax}
                  onChange={(event) => setForm((current) => ({ ...current, rateMax: event.target.value }))}
                  className={ui.input}
                  placeholder="500"
                />
              </div>
            </div>
            {rateError ? (
              <p className="mt-2 text-xs font-semibold text-red-600">{rateError}</p>
            ) : (
              <p className={ui.helper}>Minimum {MIN_HOURLY_RATE} THB/hr. Leave &quot;To&quot; empty for a single rate.</p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
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

          <fieldset>
            <legend className={ui.label}>Contact details</legend>
            <p className="-mt-1 mb-3 text-xs text-muted">
              Shown only to signed-in students who tap &quot;Contact tutor&quot;. Fill in at least one.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_CHANNELS.map(({ channel, label, placeholder }) => (
                <div key={channel}>
                  <label htmlFor={`contact-${channel}`} className="mb-1 block text-xs font-bold text-muted">
                    {label}
                  </label>
                  <input
                    id={`contact-${channel}`}
                    value={form.contacts[channel]}
                    onChange={(event) => setContact(channel, event.target.value)}
                    maxLength={100}
                    inputMode={channel === 'phone' ? 'tel' : undefined}
                    className={ui.input}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </fieldset>

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
            <p className="text-sm text-muted">You appear on Find tutors once rate, subjects, levels and a contact are filled in.</p>
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
              <dd className="font-medium text-ink">{rate.ok ? formatRate(rate.min, rate.max) : 'Not set'}</dd>
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
