'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Avatar } from '@/app/_components/avatar';
import { AVATAR_BUCKET, AVATAR_SIZE, AVATAR_TYPES, avatarObjectPath, avatarPathFromUrl, validateAvatarFile } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/client';
import { ui } from '@/lib/ui';

type AvatarUploaderProps = {
  userId: string;
  name: string;
  initialUrl: string | null;
};

/** Centre-crop to a square and resize to AVATAR_SIZE. WebP where the browser can encode it, else PNG. */
async function toSquareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas not supported');
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))), 'image/webp', 0.85),
  );
}

export function AvatarUploader({ userId, name, initialUrl }: AvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveUrl(nextUrl: string | null) {
    const supabase = createClient();
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: nextUrl }).eq('id', userId);
    if (updateError) throw new Error(updateError.message);

    // Best effort: remove the previous file so the bucket doesn't fill up with old photos.
    const oldPath = avatarPathFromUrl(url);
    if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);

    setUrl(nextUrl);
    router.refresh(); // nav avatar, tutor cards
  }

  async function handleFile(file: File) {
    setError(null);
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    try {
      const image = await toSquareImage(file);
      const path = avatarObjectPath(userId, Date.now(), image.type);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, image, { contentType: image.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      await saveUrl(data.publicUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload the photo.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await saveUrl(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name || '?'} url={url} className="h-20 w-20 text-3xl" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={ui.buttonSecondary}>
            {busy ? 'Saving...' : url ? 'Change photo' : 'Upload photo'}
          </button>
          {url && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="px-2 text-sm font-bold text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-muted">JPG, PNG or WebP, up to 5MB. We crop it to a square.</p>
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
