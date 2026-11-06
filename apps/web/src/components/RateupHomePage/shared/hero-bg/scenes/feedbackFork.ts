import { INK, glow, headlineCalm, rgba, ring, rng, type HeroScene, type RGB } from "./kit";

type Pt = readonly [number, number];
type Curve = readonly [Pt, Pt, Pt, Pt];

/* In fractions of the canvas. The happy branch leaves top-right (on to Google); the unhappy one
   ends at the team node. */
const TRUNK: Curve = [
  [0.14, 1.08],
  [0.16, 0.86],
  [0.24, 0.72],
  [0.29, 0.6],
];
const HAPPY: Curve = [
  [0.29, 0.6],
  [0.34, 0.34],
  [0.62, 0.02],
  [1.08, 0.1],
];
const UNHAPPY: Curve = [
  [0.29, 0.6],
  [0.27, 0.5],
  [0.16, 0.44],
  [0.09, 0.33],
];

const TRUNK_S = 2.2;
const BRANCH_S = 3.4;
const HAPPY_SHARE = 0.8;

interface Response {
  age: number;
  happy: boolean;
  jitter: number;
}

function at(c: Curve, u: number, w: number, h: number) {
  const v = 1 - u;
  const k = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u];
  return [
    (k[0] * c[0][0] + k[1] * c[1][0] + k[2] * c[2][0] + k[3] * c[3][0]) * w,
    (k[0] * c[0][1] + k[1] * c[1][1] + k[2] * c[2][1] + k[3] * c[3][1]) * h,
  ] as const;
}

/** Feedback: responses rise to a fork; most sail on to Google, the rest reach the team. */
export function feedbackFork(): HeroScene {
  const random = rng(11);
  const responses: Response[] = [];
  let untilNext = 0;
  let lastArrival = -9;
  let now = 0;

  const branchS = (r: Response) => (r.happy ? BRANCH_S : BRANCH_S * 0.6);

  const trace = (
    ctx: CanvasRenderingContext2D,
    c: Curve,
    color: RGB,
    alpha: number,
    w: number,
    h: number,
  ) => {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const [x, y] = at(c, i / 40, w, h);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  return {
    step(dt, t) {
      now = t;
      untilNext -= dt;
      if (untilNext <= 0) {
        untilNext = 0.42 + random() * 0.2;
        responses.push({ age: 0, happy: random() < HAPPY_SHARE, jitter: random() * 2 - 1 });
      }
      for (let i = responses.length - 1; i >= 0; i--) {
        const r = responses[i];
        r.age += dt;
        if (r.age < TRUNK_S + branchS(r)) continue;
        if (!r.happy) lastArrival = t;
        responses.splice(i, 1);
      }
    },

    draw(ctx, t, w, h) {
      trace(ctx, TRUNK, INK.blue300, 0.14, w, h);
      trace(ctx, HAPPY, INK.amber, 0.12, w, h);
      trace(ctx, UNHAPPY, INK.glow, 0.16, w, h);

      for (const r of responses) {
        if (r.age < TRUNK_S) {
          const u = r.age / TRUNK_S;
          const [x, y] = at(TRUNK, u, w, h);
          const px = x + r.jitter * 6 * (1 - u);
          glow(ctx, INK.blue300, px, y, 12, headlineCalm(px, y, w, h));
          continue;
        }
        const u = (r.age - TRUNK_S) / branchS(r);
        const [bx, by] = at(r.happy ? HAPPY : UNHAPPY, u, w, h);
        const x = bx + r.jitter * 10 * u;
        const y = by + r.jitter * 4 * u;
        const alpha = headlineCalm(x, y, w, h);
        glow(ctx, r.happy ? INK.amber : INK.glow, x, y, r.happy ? 16 : 14, alpha);
        if (!r.happy) continue;
        // A twinkling cross, so the happy ones read as stars.
        const s = 3 + Math.sin(t * 6 + r.jitter * 5) * 1.5;
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s);
        ctx.lineTo(x, y + s);
        ctx.strokeStyle = rgba(INK.starTop, 0.8 * alpha);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      const [fx, fy] = at(TRUNK, 1, w, h);
      glow(ctx, INK.blue300, fx, fy, 30, 0.5);

      const [tx, ty] = at(UNHAPPY, 1, w, h);
      glow(ctx, INK.glow, tx, ty, 46, 0.9);
      ring(ctx, tx, ty, 9, rgba(INK.blue300, 0.6), 1.2);
      const pulse = (now - lastArrival) / 1.2;
      if (pulse < 1) ring(ctx, tx, ty, 9 + pulse * 34, rgba(INK.glow, 0.7 * (1 - pulse)), 1.2);
    },
  };
}
