import { INK, TAU, glow, headlineCalm, rgba, rng, type HeroScene } from "./kit";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"] as const;
const WON = STAGES.length - 1;
const WON_HOLD_S = 3.2;

interface Lead {
  id: number;
  stage: number;
  x: number | null;
  y: number;
  alpha: number;
  /** 1 on the step it moved, decaying to 0. */
  flash: number;
  wonAt: number | null;
}

const layout = (w: number, h: number) => {
  const pad = w * 0.05;
  const lane = (w - pad * 2) / STAGES.length;
  const cw = Math.min(lane * 0.64, 132);
  const ch = Math.max(22, cw * 0.36);
  return { pad, lane, cw, ch, top: h * 0.16, gap: ch * 0.45 };
};

/** Pipeline: lead cards step across stage columns; Won glows, then clears for a new lead. */
export function stageDrift(): HeroScene {
  const random = rng(9);
  let nextId = 0;
  let untilMove = 1;
  const leads: Lead[] = [5, 4, 3, 2, 1].flatMap((n, stage) =>
    Array.from({ length: n }, () => ({
      id: nextId++,
      stage,
      x: null,
      y: 0,
      alpha: 1,
      flash: 0,
      wonAt: stage === WON ? -WON_HOLD_S : null,
    })),
  );

  return {
    step(dt, t, w, h) {
      untilMove -= dt;
      if (untilMove <= 0) {
        untilMove = 0.8 + random() * 0.6;
        // Later stages move a little more often, so Won keeps filling.
        const movable = leads.filter((l) => l.stage < WON && l.alpha >= 1);
        const weights = movable.map((l) => 1 + l.stage * 0.35);
        let roll = random() * weights.reduce((s, v) => s + v, 0);
        const lead = movable.find((_, i) => (roll -= weights[i]) <= 0);
        if (lead) {
          lead.stage++;
          lead.flash = 1;
          if (lead.stage === WON) lead.wonAt = t;
        }
      }

      for (const l of leads) {
        if (l.wonAt === null || t - l.wonAt < WON_HOLD_S) continue;
        Object.assign(l, { id: nextId++, stage: 0, x: null, alpha: 0, wonAt: null });
      }

      const { pad, lane, cw, ch, top, gap } = layout(w, h);
      const ease = Math.min(1, dt * 5);
      STAGES.forEach((_, stage) => {
        leads
          .filter((l) => l.stage === stage)
          .sort((a, b) => a.id - b.id)
          .forEach((l, i) => {
            const tx = pad + lane * (stage + 0.5) - cw / 2;
            const ty = top + i * (ch + gap);
            if (l.x === null) {
              l.x = tx;
              l.y = ty - ch;
            }
            l.x += (tx - l.x) * ease;
            l.y += (ty - l.y) * ease;
            l.alpha = Math.min(1, l.alpha + dt * 1.2);
            l.flash = Math.max(0, l.flash - dt * 0.9);
          });
      });
    },

    draw(ctx, _t, w, h) {
      const { pad, lane, cw, ch } = layout(w, h);

      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(INK.blue400, 0.2);
      ctx.beginPath();
      for (let i = 1; i < STAGES.length; i++) {
        ctx.moveTo(pad + lane * i, h * 0.1);
        ctx.lineTo(pad + lane * i, h * 0.92);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = `600 ${Math.max(9, Math.min(11, w / 90))}px "Instrument Sans Variable", system-ui, sans-serif`;
      ctx.textAlign = "center";
      STAGES.forEach((name, i) => {
        ctx.fillStyle = rgba(i === WON ? INK.green300 : INK.blue300, 0.4);
        ctx.fillText(name.toUpperCase(), pad + lane * (i + 0.5), h * 0.96);
      });

      for (const l of leads) {
        if (l.x === null) continue;
        const cx = l.x + cw / 2;
        const cy = l.y + ch / 2;
        const alpha = headlineCalm(cx, cy, w, h) * l.alpha;
        const won = l.stage === WON;
        if (won || l.flash > 0) {
          glow(
            ctx,
            won ? INK.green300 : INK.glow,
            cx,
            cy,
            cw * 1.3,
            (won ? 0.35 : 0.5 * l.flash) * alpha,
          );
        }

        ctx.beginPath();
        ctx.roundRect(l.x, l.y, cw, ch, 6);
        ctx.fillStyle = rgba(INK.blue800, 0.75 * alpha);
        ctx.fill();
        const edge = won ? INK.green300 : l.flash > 0 ? INK.glow : INK.blue300;
        ctx.strokeStyle = rgba(edge, (0.35 + 0.5 * l.flash + (won ? 0.3 : 0)) * alpha);
        ctx.stroke();

        // Owner avatar and two lines of card text.
        ctx.beginPath();
        ctx.arc(l.x + ch * 0.45, cy, ch * 0.2, 0, TAU);
        ctx.fillStyle = rgba(won ? INK.green300 : INK.blue300, 0.5 * alpha);
        ctx.fill();
        ctx.fillStyle = rgba(INK.blue300, 0.35 * alpha);
        ctx.fillRect(l.x + ch * 0.85, cy - ch * 0.16, cw * 0.5, 2);
        ctx.fillRect(l.x + ch * 0.85, cy + ch * 0.1, cw * 0.3, 2);
      }
    },
  };
}
