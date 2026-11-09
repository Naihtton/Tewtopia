// Pure helpers (no `@/` imports) so `node --test` can load them directly.
// The 250 floor is also enforced by check constraints in supabase/schema.sql.

export const MIN_HOURLY_RATE = 250;

function toInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : Number.NaN;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) ? parsed : Number.NaN;
  }
  return null; // empty / missing
}

/** Tutor profile rate: a range, or a single value when max is empty. */
export function parseRateRange(
  min: unknown,
  max: unknown,
): { ok: true; min: number; max: number } | { ok: false; error: string } {
  const low = toInteger(min);
  const highRaw = toInteger(max);

  if (low === null) {
    return { ok: false, error: 'Enter your hourly rate.' };
  }
  if (Number.isNaN(low) || Number.isNaN(highRaw)) {
    return { ok: false, error: 'Rates must be whole numbers.' };
  }
  if (low < MIN_HOURLY_RATE) {
    return { ok: false, error: `The minimum rate is ${MIN_HOURLY_RATE} THB/hr.` };
  }

  const high = highRaw ?? low;
  if (high < low) {
    return { ok: false, error: '"To" must be at least "From".' };
  }

  return { ok: true, min: low, max: high };
}

/** Offer price: a single whole number of at least 250. */
export function isValidOfferRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_HOURLY_RATE;
}

export function formatRate(min: number | null, max: number | null): string {
  if (min === null) {
    return 'Rate not set';
  }
  return max === null || max === min ? `${min} THB/hr` : `${min}–${max} THB/hr`;
}
