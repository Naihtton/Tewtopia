import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampOffset, cropRect } from './crop.ts';

// A 1000×500 landscape image in a 250px circular viewport.
const landscape = { width: 1000, height: 500, viewport: 250 };

test('cropRect at zoom 1, centred: the largest centred square', () => {
  assert.deepEqual(cropRect({ ...landscape, zoom: 1, offsetX: 0, offsetY: 0 }), { sx: 250, sy: 0, size: 500 });
});

test('cropRect zoom 2 halves the source square, still centred', () => {
  assert.deepEqual(cropRect({ ...landscape, zoom: 2, offsetX: 0, offsetY: 0 }), { sx: 375, sy: 125, size: 250 });
});

test('cropRect: dragging the image right shows more of its left side', () => {
  // zoom 1: image is drawn at 0.5 scale (500×250); 100px right = 200 source px left.
  assert.deepEqual(cropRect({ ...landscape, zoom: 1, offsetX: 100, offsetY: 0 }), { sx: 50, sy: 0, size: 500 });
});

test('clampOffset keeps the image covering the circle', () => {
  // zoom 1: drawn 500×250 in a 250 viewport → x may move ±125, y not at all.
  assert.deepEqual(clampOffset({ ...landscape, zoom: 1, offsetX: 400, offsetY: -50 }), { offsetX: 125, offsetY: 0 });
  // zoom 2: drawn 1000×500 → x ±375, y ±125.
  assert.deepEqual(clampOffset({ ...landscape, zoom: 2, offsetX: -999, offsetY: 60 }), { offsetX: -375, offsetY: 60 });
});

test('a clamped crop never leaves the image', () => {
  for (const zoom of [1, 1.7, 3]) {
    for (const [x, y] of [[9999, 9999], [-9999, -9999], [30, -40]]) {
      const offset = clampOffset({ ...landscape, zoom, offsetX: x, offsetY: y });
      const rect = cropRect({ ...landscape, zoom, ...offset });
      assert.ok(rect.sx >= -1e-9 && rect.sy >= -1e-9, `${zoom} ${x},${y} start inside`);
      assert.ok(rect.sx + rect.size <= landscape.width + 1e-9, `${zoom} ${x} right edge`);
      assert.ok(rect.sy + rect.size <= landscape.height + 1e-9, `${zoom} ${y} bottom edge`);
    }
  }
});
