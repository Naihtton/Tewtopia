'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CONTACT_CHANNELS, hasAnyContact, normalizeContactDetails, type ContactChannel, type ContactDetails } from '@/lib/contact';
import {
  DAYS,
  DETAILS_MAX,
  TEACHING_MODES,
  TIME_OPTIONS,
  validateRequestInput,
  type Day,
  type RequestInput,
  type ScheduleSlot,
} from '@/lib/requests';
import { createClient } from '@/lib/supabase/client';
import { TEACHING_LEVELS } from '@/lib/tutor-visibility';
import { ui } from '@/lib/ui';

type NewRequestFormProps = {
  subjects: string[];
  initialContacts: ContactDetails;
  // Shown on the public board next to the request.
  displayName: string;
};

type DayRow = { on: boolean; start: string; end: string };
const DEFAULT_ROW: DayRow = { on: false, start: '16:00', end: '17:00' };

function WeeklySchedule({
  rows,
  onChange,
  error,
}: {
  rows: Record<Day, DayRow>;
  onChange: (day: Day, row: DayRow) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className={ui.label}>When can you study?</legend>
      <p className="-mt-1 mb-3 text-xs text-muted">Tick the days that work, then set a time range for each.</p>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {DAYS.map(({ value, label }) => {
          const row = rows[value];
          return (
            <div key={value} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${row.on ? 'bg-primary-soft/50' : 'bg-white'}`}>
              <label className="flex w-20 cursor-pointer items-center gap-2 text-sm font-bold text-ink">
                <input
                  type="checkbox"
                  checked={row.on}
                  onChange={(event) => onChange(value, { ...row, on: event.target.checked })}
                  className="h-4 w-4 accent-cta"
                />
                {label}
              </label>
              <div className={`flex items-center gap-2 text-sm ${row.on ? '' : 'opacity-40'}`}>
                <select
                  aria-label={`${label} start time`}
                  disabled={!row.on}
                  value={row.start}
                  onChange={(event) => onChange(value, { ...row, start: event.target.value })}
                  className="rounded-xl border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-primary"
                >
                  {TIME_OPTIONS.slice(0, -1).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span className="text-muted">–</span>
                <select
                  aria-label={`${label} end time`}
                  disabled={!row.on}
                  value={row.end}
                  onChange={(event) => onChange(value, { ...row, end: event.target.value })}
                  className="rounded-xl border border-line bg-white px-2 py-1.5 text-ink outline-none focus:border-primary"
                >
                  {TIME_OPTIONS.slice(1).map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </fieldset>
  );
}

function slotsFrom(rows: Record<Day, DayRow>): ScheduleSlot[] {
  return DAYS.filter(({ value }) => rows[value].on).map(({ value }) => ({
    day: value,
    start: rows[value].start,
    end: rows[value].end,
  }));
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
  error,
}: {
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className={ui.label}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                checked ? 'border-primary bg-primary-soft text-primary-deep' : 'border-line bg-white text-ink-soft hover:border-primary/50'
              }`}
            >
              <input type="checkbox" checked={checked} onChange={() => onToggle(option.value)} className="h-4 w-4 accent-cta" />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </fieldset>
  );
}

export function NewRequestForm({ subjects, initialContacts, displayName }: NewRequestFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<RequestInput>({
    subjects: [],
    teachingLevels: [],
    teachingModes: [],
    scheduleSlots: [],
    details: '',
  });
  const [days, setDays] = useState<Record<Day, DayRow>>(
    () => Object.fromEntries(DAYS.map(({ value }) => [value, DEFAULT_ROW])) as Record<Day, DayRow>,
  );
  const [contacts, setContacts] = useState<ContactDetails>(initialContacts);
  // Ask for contacts in the form only if none are saved yet.
  const [needsContacts] = useState(() => !hasAnyContact(initialContacts));
  const [errors, setErrors] = useState<Partial<Record<keyof RequestInput | 'contacts', string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const result = validateRequestInput({ ...form, scheduleSlots: slotsFrom(days) });
    const nextErrors: typeof errors = result.ok ? {} : { ...result.errors };
    const cleanContacts = normalizeContactDetails(contacts);
    if (needsContacts && !hasAnyContact(cleanContacts)) {
      nextErrors.contacts = 'Add at least one way for tutors to reach you.';
    }
    setErrors(nextErrors);
    if (!result.ok || Object.keys(nextErrors).length > 0) {
      return;
    }

    setBusy(true);
    try {
      if (needsContacts) {
        const response = await fetch('/api/student-contacts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: cleanContacts }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          setSubmitError(data.error ?? 'Could not save your contact details.');
          return;
        }
      }

      const { value } = result;
      const { error } = await createClient().rpc('create_request', {
        p_subjects: value.subjects,
        p_teaching_levels: value.teachingLevels,
        p_details: value.details,
        p_schedule_slots: value.scheduleSlots,
        p_teaching_modes: value.teachingModes,
      });
      if (error) {
        setSubmitError(error.message);
        return;
      }

      router.push('/main/requests');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${ui.panel} max-w-3xl space-y-6 p-6`}>
      <CheckboxGroup
        legend="Subjects"
        options={subjects.map((subject) => ({ value: subject, label: subject }))}
        selected={form.subjects}
        onToggle={(value) => setForm((current) => ({ ...current, subjects: toggle(current.subjects, value) }))}
        error={errors.subjects}
      />
      <CheckboxGroup
        legend="Level"
        options={TEACHING_LEVELS.map((level) => ({ value: level.value, label: level.label }))}
        selected={form.teachingLevels}
        onToggle={(value) => setForm((current) => ({ ...current, teachingLevels: toggle(current.teachingLevels, value) }))}
        error={errors.teachingLevels}
      />
      <CheckboxGroup
        legend="How do you want to learn?"
        options={TEACHING_MODES.map((mode) => ({ value: mode.value, label: mode.label }))}
        selected={form.teachingModes}
        onToggle={(value) => setForm((current) => ({ ...current, teachingModes: toggle(current.teachingModes, value) }))}
        error={errors.teachingModes}
      />

      <WeeklySchedule
        rows={days}
        onChange={(day, row) => setDays((current) => ({ ...current, [day]: row }))}
        error={errors.scheduleSlots}
      />

      <div>
        <label htmlFor="details" className={ui.label}>
          What do you need help with? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="details"
          value={form.details}
          maxLength={DETAILS_MAX}
          onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
          className={ui.textarea}
          placeholder="e.g. Preparing for the midterm — derivatives and limits."
        />
        {errors.details && <p className="mt-2 text-xs font-semibold text-red-600">{errors.details}</p>}
      </div>

      {needsContacts && (
        <fieldset>
          <legend className={ui.label}>How can tutors reach you?</legend>
          <p className="-mt-1 mb-3 text-xs text-muted">
            Add at least one. Only tutors whose offer you accept will see it. Saved to your profile.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONTACT_CHANNELS.map(({ channel, label, placeholder }) => (
              <div key={channel}>
                <label htmlFor={`contact-${channel}`} className="mb-1 block text-xs font-bold text-muted">
                  {label}
                </label>
                <input
                  id={`contact-${channel}`}
                  value={contacts[channel]}
                  maxLength={100}
                  inputMode={channel === 'phone' ? 'tel' : undefined}
                  onChange={(event) =>
                    setContacts((current) => ({ ...current, [channel as ContactChannel]: event.target.value }))
                  }
                  className={ui.input}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          {errors.contacts && <p className="mt-2 text-xs font-semibold text-red-600">{errors.contacts}</p>}
        </fieldset>
      )}

      <p className="text-xs text-muted">
        Your request is shown on the board as <span className="font-bold text-ink">{displayName || 'Student'}</span>.
        Your contact details stay hidden until you accept an offer.{' '}
        <Link href="/main/profile" className="font-bold text-primary-deep underline underline-offset-2">
          Change display name
        </Link>
      </p>

      {submitError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      )}
      <button type="submit" disabled={busy} className={`${ui.buttonPrimary} disabled:cursor-wait`}>
        {busy ? 'Posting...' : 'Post request'}
      </button>
    </form>
  );
}
