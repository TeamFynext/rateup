/**
 * Geometry for the hero's flowing line field: two bundles of cubic béziers that drift, with
 * lights travelling along them. Everything is a pure function of `T` (seconds into the loop),
 * and every drift runs a whole number of cycles per loop, so `T = LOOP_S` equals `T = 0`.
 */

export const VIEW_W = 1920;
export const VIEW_H = 1080;
export const LOOP_S = 12;
export const LINE_TOTAL = 20;
/** The frame rendered on the server, without JS and under reduced motion. */
export const STATIC_T = 3.4;

const TAU = Math.PI * 2;

interface Point {
  x: number;
  y: number;
}

type Curve = readonly [Point, Point, Point, Point];

export interface Line {
  p: Curve;
  width: number;
  alpha: number;
}

export interface Dot {
  /** Index into the lines array, so a caller can hide a dot along with its line. */
  line: number;
  x: number;
  y: number;
  opacity: number;
  r: number;
  warm: boolean;
}

const drift = (T: number, cycles: number, phase: number, amp: number) =>
  amp * Math.sin(TAU * (T / LOOP_S) * cycles + phase);

const travel = (T: number, trips: number, phase: number) => {
  const v = (T / LOOP_S) * trips + phase;
  return v - Math.floor(v);
};

const fade = (t: number) => Math.pow(Math.sin(Math.PI * t), 0.6);

function bez([p0, p1, p2, p3]: Curve, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

interface Bundle {
  share: number;
  spread: number;
  width: number;
  alpha: number;
  base: Curve;
  /** How far each control point fans out per line, as a multiple of `spread`. */
  fan: readonly [number, number, number, number];
}

/* A wide sweep across the lower half, and a taller arc behind it for depth. */
const BUNDLES: readonly Bundle[] = [
  {
    share: 0.68,
    spread: 22,
    width: 1.3,
    alpha: 1,
    base: [
      { x: -120, y: 740 },
      { x: 520, y: 1020 },
      { x: 1280, y: 260 },
      { x: 2040, y: 560 },
    ],
    fan: [1.1, 0.5, 2.1, 1.3],
  },
  {
    share: 0.32,
    spread: 30,
    width: 1,
    alpha: 0.8,
    base: [
      { x: 560, y: 1180 },
      { x: 900, y: 120 },
      { x: 1520, y: -40 },
      { x: 2100, y: 820 },
    ],
    fan: [0.8, 1.6, 1.2, 0.9],
  },
];

export function buildLines(T: number): Line[] {
  const lines: Line[] = [];
  BUNDLES.forEach((bundle, bi) => {
    const count = Math.max(2, Math.round(LINE_TOTAL * bundle.share));
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * bundle.spread;
      const phase = i * 0.42 + bi * 1.7;
      const [b0, b1, b2, b3] = bundle.base;
      const [f0, f1, f2, f3] = bundle.fan;
      lines.push({
        p: [
          { x: b0.x, y: b0.y + offset * f0 },
          {
            x: b1.x + drift(T, 1, phase + 2.1, 40),
            y: b1.y + offset * f1 + drift(T, 1, phase, 70),
          },
          {
            x: b2.x + drift(T, 1, phase * 0.7 + 4, 60),
            y: b2.y + offset * f2 + drift(T, 2, phase * 1.3 + 0.8, 55),
          },
          { x: b3.x, y: b3.y + offset * f3 },
        ],
        width: bundle.width,
        alpha: bundle.alpha * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.3 + bi))),
      });
    }
  });
  return lines;
}

/** Which lines carry lights is decided by index alone, so the dot list has a stable order. */
export function buildDots(lines: readonly Line[], T: number): Dot[] {
  const dots: Dot[] = [];
  lines.forEach((line, i) => {
    let count = 0;
    if (i % 3 === 0) count = 2;
    else if (i % 2 === 0) count = 1;

    for (let k = 0; k < count; k++) {
      const trips = [1, 2, 3][(i * 7 + k * 5) % 3];
      const t = travel(T, trips, (i * 0.618 + k * 0.5) % 1);
      const pos = bez(line.p, t);
      dots.push({
        line: i,
        x: pos.x,
        y: pos.y,
        opacity: fade(t),
        r: 2 + ((i + k) % 3) * 0.7,
        warm: false,
      });
    }
  });

  const warmLine = Math.floor(lines.length * 0.45);
  const t = travel(T, 1, 0.3);
  const pos = bez(lines[warmLine].p, t);
  dots.push({ line: warmLine, x: pos.x, y: pos.y, opacity: fade(t), r: 3.6, warm: true });

  return dots;
}

/* Rounded to one decimal so the server's string and the client's match: `Math.sin` is not
   bit-identical across JS engines, and an unrounded `d` hydrates with a mismatch in Safari. */
const n = (v: number) => v.toFixed(1);

export function pathD({ p }: Line): string {
  return `M${n(p[0].x)} ${n(p[0].y)}C${n(p[1].x)} ${n(p[1].y)} ${n(p[2].x)} ${n(p[2].y)} ${n(p[3].x)} ${n(p[3].y)}`;
}

export function dotTransform(dot: Dot): string {
  return `translate(${n(dot.x)} ${n(dot.y)})`;
}

export function dotOpacity(dot: Dot): string {
  return dot.opacity.toFixed(2);
}

/** Offset of the ambient glow from its resting place, in percent of its own box. */
export function glowOffset(T: number): Point {
  return { x: drift(T, 1, 0.4, 6), y: drift(T, 1, 2.2, 5) };
}
