import {
  INK,
  clamp,
  glow,
  headlineCalm,
  lerp,
  ring,
  rgba,
  rng,
  smooth,
  type HeroScene,
} from "@/components/RateupHomePage/shared/hero-bg/scenes/kit";

/* WhatsApp, Instagram, Messenger, storefront — entry heights as fractions of the canvas. */
const LANES = [
  { y: 0.14, color: INK.green300 },
  { y: 0.4, color: INK.amber },
  { y: 0.66, color: INK.glow },
  { y: 0.9, color: INK.blue300 },
] as const;
/** Where carts are paid: x and y as fractions of the canvas. */
const TILL = { x: 0.8, y: 0.56 } as const;
const RING_S = 1.6;

interface Cart {
  lane: number;
  /** Progress from the left edge to the till, 0–1. */
  p: number;
  speed: number;
  offset: number;
}

const cartPoint = (cart: Cart, w: number, h: number) => {
  const bend = smooth(0.15, 1, cart.p);
  const x = lerp(-0.04, TILL.x, cart.p) * w;
  const y = (lerp(LANES[cart.lane].y, TILL.y, bend) + cart.offset * 0.03 * (1 - bend)) * h;
  return [x, y] as const;
};

/** Social commerce: carts drift in from every channel, and each one paid sends out a green ring. */
export function checkoutRings(): HeroScene {
  const random = rng(11);
  const carts: Cart[] = Array.from({ length: 56 }, (_, i) => ({
    lane: i % LANES.length,
    p: random(),
    speed: 0.05 + random() * 0.05,
    offset: random() * 2 - 1,
  }));
  const paid: number[] = [];

  return {
    step(dt, t) {
      for (const cart of carts) {
        cart.p += cart.speed * dt;
        if (cart.p < 1) continue;
        cart.p = 0;
        cart.offset = random() * 2 - 1;
        paid.push(t);
      }
      while (paid.length && t - paid[0] > RING_S) paid.shift();
    },

    draw(ctx, t, w, h) {
      const tx = TILL.x * w;
      const ty = TILL.y * h;

      ctx.lineWidth = 1;
      for (const lane of LANES) {
        ctx.beginPath();
        for (let x = 0; x <= tx; x += 12) {
          const p = x / tx;
          const y = lerp(lane.y, TILL.y, smooth(0.15, 1, p)) * h;
          if (x) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = rgba(lane.color, 0.1);
        ctx.stroke();
      }

      for (const cart of carts) {
        const [x, y] = cartPoint(cart, w, h);
        glow(ctx, LANES[cart.lane].color, x, y, 12, headlineCalm(x, y, w, h));
      }

      for (const t0 of paid) {
        const age = clamp((t - t0) / RING_S);
        ring(ctx, tx, ty, 8 + age * w * 0.09, rgba(INK.green300, 0.5 * (1 - age)), 1.2);
      }
      glow(ctx, INK.green500, tx, ty, 54 + Math.sin(t * 2.4) * 5, 0.75);
      glow(ctx, INK.glow, tx, ty, w * 0.2, 0.08);
    },
  };
}
