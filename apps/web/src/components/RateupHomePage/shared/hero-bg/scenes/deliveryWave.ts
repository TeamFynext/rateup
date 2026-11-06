import { INK, TAU, clamp, glow, headlineCalm, rgba, rng, type HeroScene } from "./kit";

const WAVE_EVERY_S = 5.5;
const SENT_S = 0.35;
const READ_SHARE = 0.7;

interface Contact {
  x: number;
  y: number;
  calm: number;
  read: boolean;
  /** Seconds after delivery before this contact reads, when it does. */
  readLag: number;
}

/** Broadcast: a send pulse sweeps a grid of contacts through sent, delivered and read. */
export function deliveryWave(): HeroScene {
  let contacts: Contact[] = [];
  const waves = [0.2];
  let nextWave = WAVE_EVERY_S;

  const source = (w: number, h: number) => [w * 0.08, h * 0.9] as const;
  const speed = (w: number, h: number) => Math.max(w, h) * 0.26;

  return {
    resize(w, h) {
      const random = rng(3);
      const gap = Math.max(22, w / 46);
      contacts = [];
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const r = random();
          contacts.push({
            x,
            y,
            calm: headlineCalm(x, y, w, h),
            read: r < READ_SHARE,
            readLag: 0.7 + r * 2.4,
          });
        }
      }
    },

    step(_dt, t) {
      if (t < nextWave) return;
      waves.push(nextWave);
      nextWave += WAVE_EVERY_S;
      if (waves.length > 3) waves.shift();
    },

    draw(ctx, t, w, h) {
      const [sx, sy] = source(w, h);
      const v = speed(w, h);

      for (const c of contacts) {
        const dist = Math.hypot(c.x - sx, c.y - sy);
        let age = -1;
        for (let i = waves.length - 1; i >= 0; i--) {
          const a = t - waves[i] - dist / v;
          if (a >= 0) {
            age = a;
            break;
          }
        }

        if (age < 0) {
          ctx.fillStyle = rgba(INK.blue400, 0.14 * c.calm);
          ctx.fillRect(c.x - 1, c.y - 1, 2, 2);
        } else if (age < SENT_S) {
          ctx.fillStyle = rgba(INK.white, (0.35 + 0.6 * (1 - age / SENT_S)) * c.calm);
          ctx.fillRect(c.x - 1.5, c.y - 1.5, 3, 3);
        } else {
          const delivered = clamp(1 - (age - SENT_S) / 4.8);
          ctx.fillStyle = rgba(INK.blue300, (0.14 + 0.4 * delivered) * c.calm);
          ctx.fillRect(c.x - 1, c.y - 1, 2, 2);
          if (c.read && age > c.readLag) {
            const since = age - c.readLag;
            glow(
              ctx,
              INK.glow,
              c.x,
              c.y,
              14,
              clamp(since / 0.3) * clamp(1 - (since - 0.3) / 3.4) * 0.85 * c.calm,
            );
          }
        }
      }

      const diagonal = Math.hypot(w, h);
      for (const t0 of waves) {
        const radius = (t - t0) * v;
        if (radius < 0 || radius > diagonal) continue;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, TAU);
        ctx.strokeStyle = rgba(INK.glow, 0.28 * (1 - radius / diagonal));
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      glow(ctx, INK.glow, sx, sy, 60 + Math.sin(t * 3) * 6, 0.9);
    },
  };
}
