'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/app/_components/modal';
import { AVATAR_SIZE } from '@/lib/avatar';
import { clampOffset, cropRect } from '@/lib/crop';
import { ui } from '@/lib/ui';

const VIEWPORT = 256; // on-screen circle, px
const MAX_ZOOM = 3;

type AvatarFramerProps = {
  // Object URL of a picked file, or the current avatar's public URL (CORS-enabled).
  src: string;
  onCancel: () => void;
  onSave: (image: Blob) => Promise<void>;
};

/** Drag to position, slide to zoom, inside a circular frame. Saves a square AVATAR_SIZE image. */
export function AvatarFramer({ src, onCancel, onSave }: AvatarFramerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ offsetX: 0, offsetY: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed to export a remote image from the canvas
    img.onload = () => setImage(img);
    img.onerror = () => setLoadError(true);
    img.src = src;
  }, [src]);

  const frame = image
    ? { width: image.naturalWidth, height: image.naturalHeight, viewport: VIEWPORT, zoom, ...offset }
    : null;

  function move(next: { offsetX: number; offsetY: number }, nextZoom = zoom) {
    if (!image) return;
    setOffset(
      clampOffset({ width: image.naturalWidth, height: image.naturalHeight, viewport: VIEWPORT, zoom: nextZoom, ...next }),
    );
  }

  async function save() {
    if (!image || !frame) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { sx, sy, size } = cropRect(frame);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas not supported');
      context.drawImage(image, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/webp', 0.85),
      );
      await onSave(blob);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not save the photo.');
      setSaving(false);
    }
  }

  const scale = frame ? (VIEWPORT / Math.min(frame.width, frame.height)) * zoom : 1;

  return (
    <Modal labelledBy="avatar-framer-title" onClose={onCancel}>
      <h2 id="avatar-framer-title" className={`${ui.title} mb-1 text-2xl`}>
        Adjust your photo
      </h2>
      <p className="mb-5 text-sm text-muted">Drag to move, use the slider to zoom.</p>

      <div className="flex flex-col items-center gap-5">
        <div
          className="relative touch-none select-none overflow-hidden rounded-full bg-cream-deep ring-4 ring-primary-soft"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: image ? 'grab' : 'default' }}
          onPointerDown={(event) => {
            if (!image) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, ...offset };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            move({
              offsetX: drag.current.offsetX + (event.clientX - drag.current.x),
              offsetY: drag.current.offsetY + (event.clientY - drag.current.y),
            });
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {frame && image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: frame.width * scale,
                height: frame.height * scale,
                left: VIEWPORT / 2 - (frame.width * scale) / 2 + offset.offsetX,
                top: VIEWPORT / 2 - (frame.height * scale) / 2 + offset.offsetY,
              }}
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
              {loadError ? 'Could not load this image.' : 'Loading…'}
            </p>
          )}
        </div>

        <label className="flex w-full max-w-xs items-center gap-3 text-sm font-semibold text-muted">
          <span aria-hidden>−</span>
          <span className="sr-only">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!image}
            onChange={(event) => {
              const nextZoom = Number(event.target.value);
              setZoom(nextZoom);
              move(offset, nextZoom);
            }}
            className="flex-1 accent-cta"
          />
          <span aria-hidden>+</span>
        </label>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={ui.buttonSecondary}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!image || saving} className={`${ui.buttonPrimary} disabled:cursor-wait`}>
            {saving ? 'Saving...' : 'Save photo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
