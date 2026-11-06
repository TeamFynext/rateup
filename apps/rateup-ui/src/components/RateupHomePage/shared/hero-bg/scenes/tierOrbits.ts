import { INK, TAU, glow, headlineCalm, pick, rgba, ring, rng, smooth, type HeroScene } from "./kit";

/* Outer, middle and gold tiers, as fractions of the outer radius. */
const RADII = [1, 0.66, 0.36] as const;
const TILT = -0.2;
const SQUASH = 0.42;
/** Past this many at rest on the gold ring, one redeems and rejoins from outside. */
const GOLD_CAP = 12;
/** Where a redeemed point re-enters, outside the outer orbit. */
const JOIN_R = 1.35;

interface Point {
  tier: number;
  r: number;
  a: number;
  speed: number;
  moving: boolean;
}

interface Flare {
  x: number;
  y: number;
  age: number;
  redeem: boolean;
}

/** Loyalty: points orbit three tiers, hop inward, and redeem from the gold ring. */
export function tierOrbits(): HeroScene {
  const random = rng(7);
  const flares: Flare[] = [];
  let untilPromotion = 1.2;

  const points: Point[] = Array.from({ length: 54 }, (_, i) => {
    const tier = i < 30 ? 0 : i < 44 ? 1 : 2;
    return {
      tier,
      r: RADII[tier],
      a: random() * TAU,
      speed: (0.05 + random() * 0.035) * (1 + tier * 0.7),
      moving: false,
    };
  });

  const place = (a: number, r: number, w: number, h: number) => {
    const base = Math.max(w, h) * 0.4;
    const ex = Math.cos(a) * base * r;
    const ey = Math.sin(a) * base * r * SQUASH;
    const [c, s] = [Math.cos(TILT), Math.sin(TILT)];
    return [w * 0.66 + ex * c - ey * s, h * 0.6 + ex * s + ey * c] as const;
  };

  return {
    step(dt, _t, w, h) {
      untilPromotion -= dt;
      if (untilPromotion <= 0) {
        untilPromotion = 0.9 + random() * 1.1;
        const promoted = pick(
          points.filter((p) => p.tier < 2 && !p.moving),
          random,
        );
        if (promoted) {
          promoted.tier++;
          promoted.moving = true;
        }
        const gold = points.filter((p) => p.tier === 2 && !p.moving);
        const redeemed = gold.length > GOLD_CAP ? pick(gold, random) : undefined;
        if (redeemed) {
          const [x, y] = place(redeemed.a, redeemed.r, w, h);
          flares.push({ x, y, age: 0, redeem: true });
          Object.assign(redeemed, { tier: 0, r: JOIN_R, moving: true });
        }
      }

      for (const p of points) {
        p.a += p.speed * dt;
        const target = RADII[p.tier];
        p.r += (target - p.r) * Math.min(1, dt * 1.5);
        if (p.moving && Math.abs(p.r - target) < 0.006) {
          p.moving = false;
          if (p.tier > 0) {
            const [x, y] = place(p.a, p.r, w, h);
            flares.push({ x, y, age: 0, redeem: false });
          }
        }
      }

      for (let i = flares.length - 1; i >= 0; i--) {
        flares[i].age += dt;
        if (flares[i].age > (flares[i].redeem ? 1.6 : 1.1)) flares.splice(i, 1);
      }
    },

    draw(ctx, _t, w, h) {
      const base = Math.max(w, h) * 0.4;
      RADII.forEach((r, tier) => {
        ctx.beginPath();
        ctx.ellipse(w * 0.66, h * 0.6, base * r, base * r * SQUASH, TILT, 0, TAU);
        ctx.strokeStyle = rgba(tier === 2 ? INK.amber : INK.blue400, 0.12 + tier * 0.04);
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      glow(ctx, INK.amber, w * 0.66, h * 0.6, base * 0.5, 0.12);

      for (const p of points) {
        const [x, y] = place(p.a, p.r, w, h);
        // The lower half of each ellipse reads as the near side.
        const depth = 0.45 + 0.55 * ((Math.sin(p.a) + 1) / 2);
        const joining = p.r > 1.05 ? smooth(JOIN_R, 1.05, p.r) : 1;
        const color = p.tier === 2 ? INK.amber : p.tier === 1 ? INK.glow : INK.blue300;
        const alpha = depth * headlineCalm(x, y, w, h) * joining * (p.tier === 0 ? 0.7 : 1);
        glow(ctx, color, x, y, 12 + p.tier * 6 + (p.moving ? 8 : 0), alpha);
      }

      for (const f of flares) {
        const u = f.age / (f.redeem ? 1.6 : 1.1);
        const alpha = (1 - u) * headlineCalm(f.x, f.y, w, h);
        const color = rgba(f.redeem ? INK.starTop : INK.amber, alpha * 0.7);
        ring(ctx, f.x, f.y, 4 + u * (f.redeem ? 60 : 30), color, f.redeem ? 1.5 : 1);
        if (!f.redeem) continue;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const an = (k / 8) * TAU;
          const d0 = 6 + u * 20;
          const d1 = d0 + 10 * (1 - u);
          ctx.moveTo(f.x + Math.cos(an) * d0, f.y + Math.sin(an) * d0);
          ctx.lineTo(f.x + Math.cos(an) * d1, f.y + Math.sin(an) * d1);
        }
        ctx.stroke();
        glow(ctx, INK.starTop, f.x, f.y, 40, alpha);
      }
    },
  };
}
