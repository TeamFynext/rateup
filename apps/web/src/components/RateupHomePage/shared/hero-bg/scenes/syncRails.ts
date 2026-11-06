import { INK, glow, headlineCalm, lerp, rgba, ring, rng, type HeroScene } from "./kit";

type Pt = readonly [number, number];

export interface SyncPartner {
  name: string;
  /** Null draws a `{ }` plate, for the API. */
  logo: string | null;
}

/* Plate centres as fractions of the band: down both sides on wide screens, one row along the
   bottom on phones, where the sides sit under the headline. The phone row clears the rounded
   sheet that rides up over the band's last 32px. */
const SIDE_SLOTS: readonly Pt[] = [
  [0.085, 0.3],
  [0.06, 0.58],
  [0.11, 0.85],
  [0.915, 0.26],
  [0.94, 0.55],
  [0.89, 0.83],
];
const HUB: Pt = [0.5, 0.56];
const NARROW = 640;
const SPEED = 0.2;

interface Packet {
  rail: number;
  u: number;
  /** Inbound: orders and customers into RateUp. Outbound: points and messages back out. */
  inbound: boolean;
}

const bezier = (p: readonly Pt[], u: number): Pt => {
  const v = 1 - u;
  const k = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u];
  return [
    k[0] * p[0][0] + k[1] * p[1][0] + k[2] * p[2][0] + k[3] * p[3][0],
    k[0] * p[0][1] + k[1] * p[1][1] + k[2] * p[2][1] + k[3] * p[3][1],
  ];
};

/**
 * Integrations: partner plates at the edges, each on a rail into the hub behind the headline.
 * Blue packets carry orders in; amber ones carry points back out, and the plate pulses on arrival.
 */
export function syncRails(partners: readonly SyncPartner[]): HeroScene {
  const random = rng(17);
  const images = partners.map((p) => {
    if (!p.logo || typeof Image === "undefined") return null;
    const img = new Image();
    img.decoding = "async";
    img.src = p.logo;
    return img;
  });
  const pulses = partners.map(() => -9);
  const packets: Packet[] = [];
  let now = 0;
  let untilNext = 0;
  let plates: Pt[] = [];
  let rails: Pt[][] = [];
  let plateSize = 48;

  return {
    resize(w, h) {
      const narrow = w < NARROW;
      plateSize = narrow ? 34 : Math.min(60, Math.max(44, w * 0.036));
      plates = partners.map((_, i) =>
        narrow
          ? [(0.1 + (0.8 * i) / Math.max(1, partners.length - 1)) * w, h - 80]
          : [SIDE_SLOTS[i % SIDE_SLOTS.length][0] * w, SIDE_SLOTS[i % SIDE_SLOTS.length][1] * h],
      );
      const hub: Pt = [HUB[0] * w, HUB[1] * h];
      rails = plates.map(([x, y]) =>
        narrow
          ? [[x, y], [x, lerp(y, hub[1], 0.5)], [hub[0], lerp(y, hub[1], 0.6)], hub]
          : [[x, y], [lerp(x, hub[0], 0.55), y], [lerp(x, hub[0], 0.7), hub[1]], hub],
      );
    },

    step(dt, t) {
      now = t;
      untilNext -= dt;
      if (untilNext <= 0 && partners.length) {
        untilNext = 0.3 + random() * 0.35;
        packets.push({
          rail: Math.floor(random() * partners.length),
          u: 0,
          inbound: random() < 0.55,
        });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.u += dt * SPEED * (0.85 + (p.rail % 3) * 0.1);
        if (p.u < 1) continue;
        if (!p.inbound) pulses[p.rail] = t;
        packets.splice(i, 1);
      }
    },

    draw(ctx, t, w, h) {
      if (!rails.length) return;

      ctx.lineWidth = 1;
      rails.forEach((rail) => {
        ctx.beginPath();
        for (let i = 0; i <= 36; i++) {
          const [x, y] = bezier(rail, i / 36);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = rgba(INK.blue400, 0.18);
        ctx.stroke();
      });

      for (const p of packets) {
        // Rails run plate → hub; outbound packets travel them backwards.
        const u = p.inbound ? p.u : 1 - p.u;
        const [x, y] = bezier(rails[p.rail], u);
        const alpha = headlineCalm(x, y, w, h);
        const [tx, ty] = bezier(
          rails[p.rail],
          p.inbound ? Math.max(0, u - 0.08) : Math.min(1, u + 0.08),
        );
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.strokeStyle = rgba(p.inbound ? INK.glow : INK.amber, 0.55 * alpha);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        glow(ctx, p.inbound ? INK.glow : INK.amber, x, y, 15, alpha);
      }

      glow(ctx, INK.glow, HUB[0] * w, HUB[1] * h, Math.min(w, h) * 0.5, 0.1);

      // Plates are solid tiles, so they paint normally over the additive light.
      ctx.globalCompositeOperation = "source-over";
      plates.forEach(([x, y], i) => {
        const since = (now - pulses[i]) / 1.1;
        if (since < 1) {
          ring(ctx, x, y, plateSize * 0.6 + since * 26, rgba(INK.amber, 0.6 * (1 - since)), 1.3);
        }
        const s = plateSize;
        const bob = Math.sin(t * 0.8 + i * 1.7) * 2;
        ctx.beginPath();
        ctx.roundRect(x - s / 2, y - s / 2 + bob, s, s, s * 0.26);
        const img = images[i];
        ctx.fillStyle = img ? "rgba(255,255,255,0.94)" : rgba(INK.blue800, 0.95);
        ctx.fill();
        ctx.strokeStyle = rgba(INK.blue300, 0.35);
        ctx.lineWidth = 1;
        ctx.stroke();
        if (img?.complete && img.naturalWidth) {
          // Wordmarks are wide and marks are square; bound each axis separately so both fill.
          const k = Math.min((s * 0.74) / img.naturalWidth, (s * 0.5) / img.naturalHeight);
          const iw = img.naturalWidth * k;
          const ih = img.naturalHeight * k;
          ctx.drawImage(img, x - iw / 2, y - ih / 2 + bob, iw, ih);
        } else if (!img) {
          ctx.fillStyle = rgba(INK.blue300, 0.9);
          ctx.font = `700 ${Math.round(s * 0.3)}px ui-monospace, "SF Mono", Menlo, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("{ }", x, y + bob);
        }
      });
    },
  };
}
