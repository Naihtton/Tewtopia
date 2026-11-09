'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/app/_components/avatar';
import { AVATAR_BUCKET, AVATAR_TYPES, avatarObjectPath, avatarPathFromUrl, validateAvatarFile } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/client';
import { AvatarFramer } from './avatar-framer';

type AvatarUploaderProps = {
  userId: string;
  name: string;
  initialUrl: string | null;
};

const menuItem = 'block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-soft hover:bg-cream hover:text-ink';

/** Round avatar with a pencil badge: upload a new photo, adjust the frame, or remove it. */
export function AvatarUploader({ userId, name, initialUrl }: AvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [framing, setFraming] = useState<string | null>(null); // image src being framed
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Free object URLs made for picked files.
  useEffect(() => () => void (framing?.startsWith('blob:') && URL.revokeObjectURL(framing)), [framing]);

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

  async function upload(image: Blob) {
    const path = avatarObjectPath(userId, Date.now(), image.type);
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, image, { contentType: image.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    await saveUrl(data.publicUrl);
    setFraming(null);
  }

  function pickFile(file: File) {
    setError(null);
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setFraming(URL.createObjectURL(file));
  }

  async function remove() {
    setMenuOpen(false);
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
    <div className="flex flex-wrap items-center gap-5">
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Edit profile photo"
          className="group relative block rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        >
          <Avatar name={name || '?'} url={url} className="h-28 w-28 text-4xl" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-ink/0 transition-colors group-hover:bg-ink/10" />
          {/* pencil badge */}
          <span className="absolute bottom-0.5 right-0.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-cta text-white shadow-md transition-transform group-hover:scale-105">
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M13.6 2.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-9.3 9.3-4 1.1a.6.6 0 0 1-.7-.7l1.1-4 9.1-9.5Z" />
            </svg>
          </span>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full z-30 mt-2 w-48 rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(46,36,51,0.14)]"
          >
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setMenuOpen(false);
                inputRef.current?.click();
              }}
            >
              Upload new photo
            </button>
            {url && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    setFraming(url);
                  }}
                >
                  Adjust frame
                </button>
                <button type="button" role="menuitem" className={`${menuItem} text-red-600`} onClick={remove}>
                  Remove photo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-ink">{url ? 'Looking good!' : 'Add a profile photo'}</p>
        <p className="text-xs text-muted">Tap the pencil to upload or adjust. JPG, PNG or WebP, up to 5MB.</p>
        {busy && <p className="text-xs text-muted">Saving…</p>}
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) pickFile(file);
        }}
      />

      {framing && <AvatarFramer src={framing} onCancel={() => setFraming(null)} onSave={upload} />}
    </div>
  );
}
