// Pure helpers (no `@/` imports) so `node --test` can load them directly.
// The listing rule here mirrors the `public_tutor_cards` view in supabase/schema.sql.

export type TeachingLevel = 'primary' | 'lower_secondary' | 'upper_secondary' | 'university' | 'adult';

export const TEACHING_LEVELS: readonly { value: TeachingLevel; label: string }[] = [
  { value: 'primary', label: 'Primary (ประถม)' },
  { value: 'lower_secondary', label: 'Lower secondary (ม.ต้น)' },
  { value: 'upper_secondary', label: 'Upper secondary (ม.ปลาย)' },
  { value: 'university', label: 'University' },
  { value: 'adult', label: 'Adult learners' },
];

export type MissingTutorField = 'display name' | 'hourly rate' | 'subjects' | 'teaching levels' | 'contact details';

export function normalizeTeachingLevels(values: unknown): TeachingLevel[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const chosen = new Set(values);
  return TEACHING_LEVELS.map((level) => level.value).filter((value) => chosen.has(value));
}

export function missingTutorFields(input: {
  displayName: string;
  hourlyRate: number | null;
  subjects: string[];
  teachingLevels: string[];
  hasContact: boolean;
}): MissingTutorField[] {
  const missing: MissingTutorField[] = [];

  if (input.displayName.trim().length === 0) missing.push('display name');
  if (input.hourlyRate === null || !(input.hourlyRate > 0)) missing.push('hourly rate');
  if (input.subjects.length === 0) missing.push('subjects');
  if (normalizeTeachingLevels(input.teachingLevels).length === 0) missing.push('teaching levels');
  if (!input.hasContact) missing.push('contact details');

  return missing;
}

// Full listing rule (fields + visibility), matching the public_tutor_cards view.
export function tutorListingStatus(
  input: Parameters<typeof missingTutorFields>[0] & { visibility: string | null },
): { listed: boolean; missing: MissingTutorField[]; hiddenByPrivacy: boolean } {
  const missing = missingTutorFields(input);
  const hiddenByPrivacy = input.visibility === 'private';

  return { listed: missing.length === 0 && !hiddenByPrivacy, missing, hiddenByPrivacy };
}

// The same rule as tutorListingStatus, as a step-by-step checklist for the dashboard.
export function tutorSetupChecklist(
  input: Parameters<typeof tutorListingStatus>[0],
): { label: string; done: boolean }[] {
  const { missing, hiddenByPrivacy } = tutorListingStatus(input);

  return [
    { label: 'Set a display name', done: !missing.includes('display name') },
    { label: 'Add subjects you teach', done: !missing.includes('subjects') },
    { label: 'Set your hourly rate', done: !missing.includes('hourly rate') },
    { label: 'Choose the levels you teach', done: !missing.includes('teaching levels') },
    { label: 'Add at least one contact channel', done: !missing.includes('contact details') },
    { label: 'Visibility is not set to Private', done: !hiddenByPrivacy },
  ];
}
