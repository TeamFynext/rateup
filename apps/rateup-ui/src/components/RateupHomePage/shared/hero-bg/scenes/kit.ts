/** A canvas hero background. State lives in `step`; `draw` only paints, so the host can warm a
    scene up without drawing it. Sizes are CSS pixels. */
export interface HeroScene {
  resize?(w: number, h: number): void;
  step(dt: number, t: number, w: number, h: number): void;
  draw(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void;
  /** Additive light suits the navy band; a light ground needs "source-over". */
  blend?: GlobalCompositeOperation;
}

export type SceneFactory = () => HeroScene;

export type RGB = readonly [number, number, number];

/* Canvas can't read CSS variables cheaply per mark, so these mirror foundation.css. */
export const INK = {
  blue100: [223, 234, 247],
  blue300: [144, 178, 220],
  blue400: [90, 140, 198],
  blue600: [28, 81, 142],
  blue800: [19, 51, 85],
  glow: [47, 163, 255],
  amber: [248, 149, 29],
  starTop: [255, 213, 76],
  green300: [123, 211, 160],
  green500: [31, 168, 91],
  white: [255, 255, 255],
} as const satisfies Record<string, RGB>;

export const TAU = Math.PI * 2;

export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Seeded, so a scene lays out the same on every visit. */
export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(items: readonly T[], random: () => number): T | undefined =>
  items[Math.floor(random() * items.length)];

/** Opacity multiplier that drops marks to 28% inside an ellipse, so they stay behind the copy.
    Centre and radii are fractions of the canvas. */
export type Calm = (x: number, y: number, w: number, h: number) => number;

export const calmZone =
  (cx: number, cy: number, rx: number, ry: number): Calm =>
  (x, y, w, h) => {
    const dx = (x - w * cx) / (w * rx);
    const dy = (y - h * cy) / (h * ry);
    return 0.28 + 0.72 * smooth(0.5, 1.2, Math.hypot(dx, dy));
  };

/** The centred NavyHero headline block. */
export const headlineCalm = calmZone(0.5, 0.5, 0.4, 0.34);

/* Radial gradients per mark are the expensive part of a glow, so each colour is drawn once to
   an offscreen sprite and stamped with drawImage. */
const sprites = new Map<string, HTMLCanvasElement>();

function sprite(c: RGB) {
  const key = c.join();
  const cached = sprites.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d");
  if (g) {
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, rgba(INK.white, 1));
    gradient.addColorStop(0.1, rgba(c, 1));
    gradient.addColorStop(0.3, rgba(c, 0.35));
    gradient.addColorStop(1, rgba(c, 0));
    g.fillStyle = gradient;
    g.fillRect(0, 0, 64, 64);
  }
  sprites.set(key, canvas);
  return canvas;
}

export function glow(
  ctx: CanvasRenderingContext2D,
  c: RGB,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(sprite(c), x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
}

export function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  width = 1,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
