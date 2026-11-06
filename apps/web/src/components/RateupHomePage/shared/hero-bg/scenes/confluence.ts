import { INK, glow, headlineCalm, lerp, rgba, rng, smooth, type HeroScene } from "./kit";

/* WhatsApp, Instagram, Messenger — entry heights as fractions of the canvas. */
const CHANNELS = [
  { y: 0.18, color: INK.green300 },
  { y: 0.5, color: INK.amber },
  { y: 0.84, color: INK.glow },
] as const;
const MERGE_Y = 0.58;

interface Message {
  lane: number;
  /** Progress across the canvas, 0–1. */
  x: number;
  speed: number;
  /** Offset within the stream, -1–1. */
  offset: number;
}

const laneY = (lane: number, x: number, offset: number, t: number) => {
  const merged = smooth(0.06, 0.74, x);
  const wobble = Math.sin(x * 9 + t * 0.55 + lane * 2.1) * 0.035 * (1 - merged);
  return lerp(CHANNELS[lane].y, MERGE_Y, merged) + wobble + offset * lerp(0.05, 0.012, merged);
};

/** Inbox: three channel streams braid into one lane and turn one colour. */
export function confluence(): HeroScene {
  const random = rng(5);
  const messages: Message[] = Array.from({ length: 132 }, (_, i) => ({
    lane: i % CHANNELS.length,
    x: random(),
    speed: 0.045 + random() * 0.04,
    offset: random() * 2 - 1,
  }));

  return {
    step(dt) {
      for (const m of messages) {
        m.x += m.speed * dt;
        if (m.x > 1.04) {
          m.x = -0.04;
          m.offset = random() * 2 - 1;
        }
      }
    },

    draw(ctx, t, w, h) {
      ctx.lineWidth = 1;
      CHANNELS.forEach((channel, lane) => {
        for (const offset of [-1, 0, 1]) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 12) {
            const y = laneY(lane, x / w, offset, t) * h;
            if (x) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.strokeStyle = rgba(channel.color, offset === 0 ? 0.13 : 0.06);
          ctx.stroke();
        }
      });

      for (const m of messages) {
        const x = m.x * w;
        const y = laneY(m.lane, m.x, m.offset, t) * h;
        const merged = smooth(0.6, 0.84, m.x);
        const alpha = headlineCalm(x, y, w, h);
        glow(ctx, CHANNELS[m.lane].color, x, y, 11, (1 - merged) * alpha);
        glow(ctx, INK.blue100, x, y, 11, merged * alpha);
      }
      glow(ctx, INK.glow, w * 0.76, h * MERGE_Y, w * 0.22, 0.1);
    },
  };
}
