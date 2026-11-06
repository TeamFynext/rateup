import {
  INK,
  TAU,
  calmZone,
  clamp,
  glow,
  headlineCalm,
  rgba,
  ring,
  rng,
  smooth,
  type Calm,
  type HeroScene,
} from "./kit";

const CYCLE_S = 9.5;
const SWEEP_S = 4.2;
const APPROVED_SHARE = 0.07;

interface Tile {
  x: number;
  y: number;
  /** When the sweep reaches it, as a fraction of the sweep. */
  at: number;
  approved: boolean;
  calm: number;
}

/* Mirrors the Business API hero's grid: `max-w-280 px-5`, and from `lg` a 7fr/5fr split with
   the copy on the left. Below `lg` the copy stacks above the phone. */
function copyCalm(w: number): Calm {
  if (w < 1024) return calmZone(0.5, 0.3, 0.55, 0.3);
  const inner = Math.min(w - 40, 1080);
  const left = (w - inner) / 2;
  return calmZone((left + inner * 0.29) / w, 0.45, (inner * 0.34) / w, 0.42);
}

/**
 * Business API: hexagon tiles flip on in a sweep and a few land green, as approved templates.
 * On the navy band it glows from the bottom-left; on a light ground it is drawn in navy ink and
 * sweeps from the bottom-right, behind the phone.
 */
export function tileLattice({ ground }: Readonly<{ ground: "navy" | "light" }>): HeroScene {
  const light = ground === "light";
  let tiles: Tile[] = [];
  let size = 0;
  let calm: Calm = headlineCalm;

  const originX = (w: number) => (light ? w : 0);

  return {
    blend: light ? "source-over" : "lighter",

    resize(w, h) {
      const random = rng(13);
      calm = light ? copyCalm(w) : headlineCalm;
      size = Math.max(20, w / 30);
      const dx = size * 1.5;
      const dy = size * Math.sqrt(3);
      const diagonal = Math.hypot(w, h);
      tiles = [];
      for (let i = -1; i * dx < w + size; i++) {
        for (let j = -1; j * dy < h + size; j++) {
          const x = i * dx;
          const y = j * dy + (i % 2 ? dy / 2 : 0);
          const r = random();
          tiles.push({
            x,
            y,
            at: Math.hypot(x - originX(w), h - y) / diagonal + r * 0.12,
            approved: r < APPROVED_SHARE,
            calm: calm(x, y, w, h),
          });
        }
      }
    },

    step() {},

    draw(ctx, t, w, h) {
      const phase = t % CYCLE_S;
      const fade = 1 - smooth(7.6, 9.3, phase);
      const sweep = phase / SWEEP_S;
      // Light ground: navy ink at lower strength, and no additive glows.
      const ink = light ? 0.55 : 1;
      const r = size * 0.9;

      if (sweep < 1.2) {
        const color = light ? INK.blue600 : INK.glow;
        ring(
          ctx,
          originX(w),
          h,
          sweep * Math.hypot(w, h),
          rgba(color, 0.25 * ink * (1 - sweep / 1.2)),
          1.5,
        );
      }

      for (const tile of tiles) {
        const f = clamp((sweep - tile.at) / 0.1);
        if (f <= 0) continue;
        const flip = 1 - (1 - f) ** 3;
        const alpha = tile.calm * fade * ink;

        ctx.save();
        ctx.translate(tile.x, tile.y);
        ctx.scale(1, Math.max(0.02, flip));
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const an = (k / 6) * TAU;
          ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath();
        ctx.restore();

        const green = light ? INK.green500 : INK.green300;
        if (tile.approved) {
          ctx.fillStyle = rgba(green, (light ? 0.07 : 0.14) * alpha * flip);
          ctx.fill();
        }
        const flash = 1 - f;
        const plain = light ? INK.blue600 : flash > 0.05 ? INK.glow : INK.blue400;
        const edge = tile.approved ? green : plain;
        ctx.strokeStyle = rgba(
          edge,
          (tile.approved ? (light ? 0.3 : 0.6) : (light ? 0.14 : 0.2) + 0.6 * flash) * alpha,
        );
        ctx.lineWidth = 1;
        ctx.stroke();

        if (!light && tile.approved && f > 0.9)
          glow(ctx, INK.green300, tile.x, tile.y, size * 1.6, 0.35 * alpha);
      }

      if (!light) glow(ctx, INK.glow, 0, h, Math.max(w, h) * 0.5, 0.12);
    },
  };
}
