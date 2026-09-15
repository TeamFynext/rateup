/**
 * Generates every platform icon slot from a single source of truth.
 *
 * Source:  assets/brand/star-mark.svg  (the star + pin mark)
 *          assets/brand/wordmark.png   (the full "rateup" lockup)
 *
 * Outputs (all committed; EAS does not run this script):
 *   assets/images/icon.png              1024, OPAQUE white  - iOS App Store icon (Apple rejects alpha)
 *   assets/images/adaptive-icon.png     1024, transparent   - Android adaptive foreground, mark inside safe zone
 *   assets/images/notification-icon.png   96, white silhouette on transparent - Android status bar requirement
 *   assets/images/favicon.png             48, transparent   - web
 *   assets/images/splash-logo.png        800w, transparent  - splash, drawn at 200dp
 *
 * Run: npm run brand:assets
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARK_SVG = path.join(ROOT, "assets/brand/star-mark.svg");
const WORDMARK = path.join(ROOT, "assets/brand/wordmark.png");
const OUT = path.join(ROOT, "assets/images");

// The mark's viewBox: "30 -3 56 55". Not perfectly square, so every render
// fits-to-box and centers rather than stretching.
const VB_W = 56;
const VB_H = 55;

const svgSource = await readFile(MARK_SVG, "utf8");

/** Rasterise the mark to fit inside `box` px, preserving aspect. Returns {buffer, width, height}. */
async function rasterMark(box) {
  const scale = Math.min(box / VB_W, box / VB_H);
  const width = Math.max(1, Math.round(VB_W * scale));
  const height = Math.max(1, Math.round(VB_H * scale));
  // librsvg needs explicit dimensions; the source only carries a viewBox.
  const sized = svgSource.replace("<svg ", `<svg width="${width}" height="${height}" `);
  const buffer = await sharp(Buffer.from(sized)).png().toBuffer();
  return { buffer, width, height };
}

/** Place the mark, scaled to `coverage` of the canvas, centered on a `size` square. */
async function markOnCanvas({ size, coverage, background }) {
  const { buffer, width, height } = await rasterMark(Math.round(size * coverage));
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: buffer,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

/** Flatten the mark to a pure white silhouette, keeping its alpha. */
async function whiteSilhouette({ size, coverage }) {
  const { buffer, width, height } = await rasterMark(Math.round(size * coverage));
  const placed = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: buffer, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) },
    ])
    .png()
    .toBuffer();

  const alpha = await sharp(placed).extractChannel(3).toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .joinChannel(alpha)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const written = [];
async function emit(name, buffer) {
  const file = path.join(OUT, name);
  await writeFile(file, buffer);
  const meta = await sharp(buffer).metadata();
  written.push({
    name,
    size: `${meta.width}x${meta.height}`,
    kb: (buffer.length / 1024).toFixed(1),
  });
}

// iOS App Store icon: App Store Connect rejects icons that carry an alpha
// channel at all, so flatten onto white and drop the channel entirely.
await emit(
  "icon.png",
  await sharp(
    await markOnCanvas({
      size: 1024,
      coverage: 0.7,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    }),
  )
    .flatten({ background: "#FFFFFF" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

// Android adaptive foreground: transparent, and the mark must sit inside the
// 66% safe zone or the launcher mask will clip it. 0.53 matches the previous
// asset's content box (540px of 1024).
await emit("adaptive-icon.png", await markOnCanvas({ size: 1024, coverage: 0.53 }));

// Android notification icon: the system tints it, so any colour is discarded.
// It must be a white silhouette on transparent or it renders as a grey blob.
await emit("notification-icon.png", await whiteSilhouette({ size: 96, coverage: 0.9 }));

// Web favicon.
await emit("favicon.png", await markOnCanvas({ size: 48, coverage: 1.0 }));

// Splash: the full wordmark, trimmed of its large transparent margin, then
// resized to 4x the 200dp render width (xxxhdpi) with a small breathing margin.
const trimmed = await sharp(WORDMARK).trim().toBuffer();
const splashInner = await sharp(trimmed)
  .resize({ width: 800, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer();
const inner = await sharp(splashInner).metadata();
const pad = Math.round(inner.width * 0.05);
await emit(
  "splash-logo.png",
  await sharp(splashInner)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

console.table(written);
console.log("\nBrand assets regenerated from assets/brand/star-mark.svg");
