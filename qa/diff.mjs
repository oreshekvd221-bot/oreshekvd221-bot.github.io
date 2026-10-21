// QA pixel diff: compares each qa/shots/<scenario>-<variant>.png against its
// reference/figma PNG, and writes to qa/diff/<scenario>-<variant>/:
//   overlay.png — the two images blended 50/50 (both aligned top-left)
//   diffmap.png — figma image with differing pixels painted solid magenta
//   stats.json  — dimensions + percent of compared pixels that differ
//
// A pixel only counts as "different" past a tolerance (default 40 per
// summed RGB channel delta) so normal font-rendering/antialiasing noise
// between Chromium and Figma's renderer doesn't dominate the report —
// this is about layout/spacing/color discrepancies, not an exact bitmap
// match (text content itself is also expected to differ: Figma's copy is
// placeholder, ours is real data).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const DIFF = path.join(__dirname, 'diff');
const FIGMA = path.join(ROOT, 'reference', 'figma');

const scenarios = [
  { id: 'home', figma: { desktop: 'desktop/01-home.png', mobile: 'mobile/01-home.png' } },
  { id: 'tour-page', figma: { desktop: 'desktop/02-tour-page.png', mobile: 'mobile/02-tour-page.png' } },
  { id: 'checkout-details', figma: { desktop: 'desktop/03-checkout-details.png', mobile: 'mobile/03-checkout-details.png' } },
  { id: 'checkout-payment', figma: { desktop: 'desktop/04-checkout-payment.png', mobile: 'mobile/04-checkout-payment.png' } },
  { id: 'checkout-details-error', figma: { desktop: 'desktop/05-checkout-details-error.png', mobile: 'mobile/05-checkout-details-error.png' } },
  { id: 'checkout-hold-expired', figma: { desktop: 'desktop/06-checkout-hold-expired.png', mobile: 'mobile/06-checkout-hold-expired.png' } },
  { id: 'checkout-no-vacancies', figma: { desktop: 'desktop/07-checkout-no-vacancies.png', mobile: 'mobile/07-checkout-no-vacancies.png' } },
  { id: 'checkout-booking-confirmed', figma: { desktop: 'desktop/08-checkout-booking-confirmed.png', mobile: 'mobile/08-checkout-booking-confirmed.png' } },
  { id: '404', figma: { desktop: 'desktop/09-404.png', mobile: 'mobile/09-404.png' } },
  { id: 'my-bookings', figma: { desktop: 'desktop/my-bookings.png', mobile: 'mobile/my-bookings.png' } },
  { id: 'profile', figma: { desktop: 'desktop/profile.png', mobile: 'mobile/profile.png' } },
];

const TOLERANCE = Number(process.env.QA_TOLERANCE || 40);

async function loadRaw(file) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function diffPair(figmaPath, shotPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const a = await loadRaw(figmaPath); // figma reference
  const b = await loadRaw(shotPath); // our screenshot

  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const diffBuf = Buffer.alloc(w * h * 4);
  let diffCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ai = (y * a.width + x) * 4;
      const bi = (y * b.width + x) * 4;
      const di = (y * w + x) * 4;
      const dr = Math.abs(a.data[ai] - b.data[bi]);
      const dg = Math.abs(a.data[ai + 1] - b.data[bi + 1]);
      const db = Math.abs(a.data[ai + 2] - b.data[bi + 2]);
      const delta = dr + dg + db;
      if (delta > TOLERANCE) {
        diffCount++;
        diffBuf[di] = 255;
        diffBuf[di + 1] = 0;
        diffBuf[di + 2] = 229;
        diffBuf[di + 3] = 255;
      } else {
        // dim original for context
        diffBuf[di] = Math.round(a.data[ai] * 0.35 + 255 * 0.65);
        diffBuf[di + 1] = Math.round(a.data[ai + 1] * 0.35 + 255 * 0.65);
        diffBuf[di + 2] = Math.round(a.data[ai + 2] * 0.35 + 255 * 0.65);
        diffBuf[di + 3] = 255;
      }
    }
  }

  await sharp(diffBuf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(outDir, 'diffmap.png'));

  // 50/50 overlay for a quick visual sanity check (also clipped to overlap)
  const overlayBuf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ai = (y * a.width + x) * 4;
      const bi = (y * b.width + x) * 4;
      const oi = (y * w + x) * 4;
      overlayBuf[oi] = Math.round(a.data[ai] * 0.5 + b.data[bi] * 0.5);
      overlayBuf[oi + 1] = Math.round(a.data[ai + 1] * 0.5 + b.data[bi + 1] * 0.5);
      overlayBuf[oi + 2] = Math.round(a.data[ai + 2] * 0.5 + b.data[bi + 2] * 0.5);
      overlayBuf[oi + 3] = 255;
    }
  }
  await sharp(overlayBuf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(outDir, 'overlay.png'));

  const stats = {
    figma: { width: a.width, height: a.height },
    shot: { width: b.width, height: b.height },
    compared: { width: w, height: h },
    diffPixels: diffCount,
    totalPixels: w * h,
    diffPercent: +((diffCount / (w * h)) * 100).toFixed(2),
    tolerance: TOLERANCE,
  };
  fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2));
  return stats;
}

async function main() {
  const only = process.argv.slice(2);
  const list = only.length ? scenarios.filter((s) => only.includes(s.id)) : scenarios;
  const summary = [];
  for (const scenario of list) {
    for (const variant of ['desktop', 'mobile']) {
      const figmaRel = scenario.figma[variant];
      if (!figmaRel) continue;
      const figmaPath = path.join(FIGMA, figmaRel);
      const shotPath = path.join(SHOTS, `${scenario.id}-${variant}.png`);
      if (!fs.existsSync(figmaPath) || !fs.existsSync(shotPath)) {
        console.error(`SKIP ${scenario.id}-${variant}: missing ${!fs.existsSync(figmaPath) ? figmaPath : shotPath}`);
        continue;
      }
      const outDir = path.join(DIFF, `${scenario.id}-${variant}`);
      const stats = await diffPair(figmaPath, shotPath, outDir);
      summary.push({ id: `${scenario.id}-${variant}`, ...stats });
      console.log(`${scenario.id}-${variant}: ${stats.diffPercent}% diff (figma ${stats.figma.width}x${stats.figma.height}, shot ${stats.shot.width}x${stats.shot.height})`);
    }
  }
  fs.writeFileSync(path.join(DIFF, 'summary.json'), JSON.stringify(summary, null, 2));
}

main();
