// Pure helpers (no `@/` imports) so `node --test` can load them directly.
// Avatars live in the public Supabase Storage bucket "avatars", one folder per user;
// storage policies and a profiles trigger in supabase/schema.sql enforce the same rules.

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
// Uploaded images are resized in the browser to a square of this size (WebP).
export const AVATAR_SIZE = 512;

export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Use a JPG, PNG or WebP image.';
  }
  if (file.size <= 0) {
    return 'That file is empty.';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Images must be 5MB or smaller.';
  }
  return null;
}

/** "<userId>/<timestamp>.webp" — a new name per upload so browsers don't show a cached old photo. */
export function avatarObjectPath(userId: string, now: number = Date.now(), type: string = 'image/webp'): string {
  return `${userId}/${now}.${type === 'image/png' ? 'png' : 'webp'}`;
}

const PUBLIC_PREFIX = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

/** The object path inside the avatars bucket for one of its public URLs, else null. */
export function avatarPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    return pathname.startsWith(PUBLIC_PREFIX) ? decodeURIComponent(pathname.slice(PUBLIC_PREFIX.length)) : null;
  } catch {
    return null;
  }
}
