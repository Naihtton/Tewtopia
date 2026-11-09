import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/profiles';
import { parseCommaSeparatedList, syncTutorTeachingModes } from '@/lib/profile-sync';
import { createClient } from '@/lib/supabase/server';
import { parseRateRange } from '@/lib/rates';
import { normalizeContactDetails } from '@/lib/contact';
import { normalizeTeachingLevels } from '@/lib/tutor-visibility';

function contactColumns(contacts: ReturnType<typeof normalizeContactDetails>) {
  return {
    contact_instagram: contacts.instagram,
    contact_facebook: contacts.facebook,
    contact_phone: contacts.phone,
    contact_line: contacts.line,
  };
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function GET() {
  const result = await getCurrentUserProfile();

  if (!result) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (result.profile.role !== 'tutor') {
    return NextResponse.json({ error: 'Tutor access required' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .select('id, headline, hourly_rate_min, hourly_rate_max, years_experience, teaching_modes, teaching_levels, contact_instagram, contact_facebook, contact_phone, contact_line, about, updated_at')
    .eq('id', result.profile.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tutorProfile: data ?? {
      id: result.profile.id,
      headline: '',
      hourly_rate_min: null,
      hourly_rate_max: null,
      years_experience: null,
      teaching_modes: [],
      teaching_levels: [],
      contact_instagram: '',
      contact_facebook: '',
      contact_phone: '',
      contact_line: '',
      about: '',
      updated_at: null,
    },
  });
}

export async function PATCH(request: Request) {
  const result = await getCurrentUserProfile();

  if (!result) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (result.profile.role !== 'tutor') {
    return NextResponse.json({ error: 'Tutor access required' }, { status: 403 });
  }

  const body = (await request.json()) as {
    headline?: unknown;
    rateMin?: unknown;
    rateMax?: unknown;
    yearsExperience?: unknown;
    teachingModes?: unknown;
    teachingLevels?: unknown;
    contacts?: unknown;
    about?: unknown;
  };

  // Both empty = rate not set yet (tutor stays unlisted). Otherwise it must be a valid range.
  const rateMinEmpty = body.rateMin === null || body.rateMin === undefined || String(body.rateMin).trim() === '';
  const rateMaxEmpty = body.rateMax === null || body.rateMax === undefined || String(body.rateMax).trim() === '';
  let rate = { hourly_rate_min: null as number | null, hourly_rate_max: null as number | null };
  if (!(rateMinEmpty && rateMaxEmpty)) {
    const parsed = parseRateRange(body.rateMin, body.rateMax);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    rate = { hourly_rate_min: parsed.min, hourly_rate_max: parsed.max };
  }

  const payload = {
    id: result.profile.id,
    headline: typeof body.headline === 'string' ? body.headline.trim() : '',
    ...rate,
    years_experience: parseNumber(body.yearsExperience),
    teaching_modes: parseCommaSeparatedList(body.teachingModes),
    teaching_levels: normalizeTeachingLevels(body.teachingLevels),
    ...contactColumns(normalizeContactDetails(body.contacts)),
    about: typeof body.about === 'string' ? body.about.trim() : '',
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, headline, hourly_rate_min, hourly_rate_max, years_experience, teaching_modes, teaching_levels, contact_instagram, contact_facebook, contact_phone, contact_line, about, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await syncTutorTeachingModes(supabase, result.profile.id, payload.teaching_modes);
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'Unable to sync tutor teaching modes.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ tutorProfile: data });
}
