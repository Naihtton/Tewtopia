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

export type MissingTutorField = 'display name' | 'hourly rate' | 'subjects' | 'teaching levels';

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
}): MissingTutorField[] {
  const missing: MissingTutorField[] = [];

  if (input.displayName.trim().length === 0) missing.push('display name');
  if (input.hourlyRate === null || !(input.hourlyRate > 0)) missing.push('hourly rate');
  if (input.subjects.length === 0) missing.push('subjects');
  if (normalizeTeachingLevels(input.teachingLevels).length === 0) missing.push('teaching levels');

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
