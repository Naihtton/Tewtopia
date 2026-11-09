// Pure helpers (no `@/` imports) so `node --test` can load them directly.
// Geometry for the circular avatar framer: the image is scaled to cover a square
// viewport (zoom 1 = shortest side fills it), then panned by an offset in viewport px.

type Frame = {
  width: number; // image natural size
  height: number;
  viewport: number; // on-screen viewport side, px
  zoom: number; // ≥ 1
  offsetX: number; // image centre relative to viewport centre, viewport px
  offsetY: number;
};

function scaleOf({ width, height, viewport, zoom }: Pick<Frame, 'width' | 'height' | 'viewport' | 'zoom'>) {
  return (viewport / Math.min(width, height)) * zoom;
}

/** Keep the image covering the whole viewport (no empty edges inside the circle). */
export function clampOffset(frame: Frame): { offsetX: number; offsetY: number } {
  const scale = scaleOf(frame);
  const maxX = Math.max(0, (frame.width * scale - frame.viewport) / 2);
  const maxY = Math.max(0, (frame.height * scale - frame.viewport) / 2);
  const clamp = (value: number, max: number) => Math.min(max, Math.max(-max, value)) + 0; // +0 turns -0 into 0
  return { offsetX: clamp(frame.offsetX, maxX), offsetY: clamp(frame.offsetY, maxY) };
}

/** The square of the source image that is visible in the viewport. */
export function cropRect(frame: Frame): { sx: number; sy: number; size: number } {
  const scale = scaleOf(frame);
  const size = frame.viewport / scale;
  const centreX = frame.width / 2 - frame.offsetX / scale;
  const centreY = frame.height / 2 - frame.offsetY / scale;
  return { sx: centreX - size / 2, sy: centreY - size / 2, size };
}
