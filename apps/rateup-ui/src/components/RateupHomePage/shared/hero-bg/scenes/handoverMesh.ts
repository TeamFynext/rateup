import { INK, glow, headlineCalm, lerp, pick, rgba, ring, rng, type HeroScene } from "./kit";

const COLS = 11;
const ROWS = 6;
/* Near these points (fractions of the canvas) sit the team's nodes. */
const TEAM_AT = [
  [0.07, 0.28],
  [0.93, 0.22],
  [0.86, 0.86],
] as const;
const MAX_SIGNALS = 11;

interface Signal {
  from: number;
  to: number;
  u: number;
  hops: number;
  /** Set once the signal is handed over; it then routes to this team node. */
  target: number | null;
}

/** Meta AI agent: blue signals hop a mesh; now and then one turns amber and reaches the team. */
export function handoverMesh(): HeroScene {
  const random = rng(21);
  const nodes: Array<{ u: number; v: number }> = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      nodes.push({
        u: (i + 0.5 + (random() - 0.5) * 0.8) / COLS,
        v: (j + 0.5 + (random() - 0.5) * 0.8) / ROWS,
      });
    }
  }

  const links = nodes.map(() => new Set<number>());
  nodes.forEach((n, i) => {
    nodes
      .map((m, k) => ({ k, d: Math.hypot((m.u - n.u) * 1.8, m.v - n.v) }))
      .filter(({ k }) => k !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ k }) => {
        links[i].add(k);
        links[k].add(i);
      });
  });

  const nearest = (candidates: readonly number[], u: number, v: number) =>
    candidates.reduce((best, k) =>
      Math.hypot(nodes[k].u - u, nodes[k].v - v) < Math.hypot(nodes[best].u - u, nodes[best].v - v)
        ? k
        : best,
    );
  const all = nodes.map((_, i) => i);
  const team = TEAM_AT.map(([u, v]) => nearest(all, u, v));

  const signals: Signal[] = [];
  const arrivals: Array<{ node: number; age: number }> = [];
  let untilSpawn = 0;
  let untilHandover = 2;

  return {
    step(dt, _t, w, h) {
      untilSpawn -= dt;
      if (untilSpawn <= 0 && signals.length < MAX_SIGNALS) {
        untilSpawn = 0.35;
        const from = Math.floor(random() * nodes.length);
        const to = pick([...links[from]], random) ?? from;
        signals.push({ from, to, u: 0, hops: 4 + Math.floor(random() * 4), target: null });
      }

      untilHandover -= dt;
      if (untilHandover <= 0) {
        untilHandover = 2.8 + random() * 1.4;
        const handed = pick(
          signals.filter((s) => s.target === null),
          random,
        );
        if (handed) {
          handed.target = nearest(team, nodes[handed.to].u, nodes[handed.to].v);
          handed.hops = 14;
        }
      }

      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        const len =
          Math.hypot(
            (nodes[s.to].u - nodes[s.from].u) * w,
            (nodes[s.to].v - nodes[s.from].v) * h,
          ) || 1;
        s.u += (dt * (s.target === null ? 120 : 150)) / len;
        if (s.u < 1) continue;

        if (s.to === s.target) {
          arrivals.push({ node: s.to, age: 0 });
          signals.splice(i, 1);
          continue;
        }
        if (--s.hops <= 0) {
          signals.splice(i, 1);
          continue;
        }
        const onward = [...links[s.to]].filter((k) => k !== s.from);
        const options = onward.length ? onward : [...links[s.to]];
        const next =
          s.target === null
            ? (pick(options, random) ?? s.from)
            : nearest(options, nodes[s.target].u, nodes[s.target].v);
        Object.assign(s, { from: s.to, to: next, u: 0 });
      }

      for (let i = arrivals.length - 1; i >= 0; i--) {
        arrivals[i].age += dt;
        if (arrivals[i].age > 1.3) arrivals.splice(i, 1);
      }
    },

    draw(ctx, _t, w, h) {
      const px = (i: number) => [nodes[i].u * w, nodes[i].v * h] as const;

      ctx.lineWidth = 1;
      links.forEach((set, i) => {
        for (const k of set) {
          if (k < i) continue;
          const [x1, y1] = px(i);
          const [x2, y2] = px(k);
          ctx.strokeStyle = rgba(
            INK.blue400,
            0.14 * headlineCalm((x1 + x2) / 2, (y1 + y2) / 2, w, h),
          );
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });
      nodes.forEach((_, i) => {
        const [x, y] = px(i);
        ctx.fillStyle = rgba(INK.blue300, 0.4 * headlineCalm(x, y, w, h));
        ctx.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      });

      for (const s of signals) {
        const [x1, y1] = px(s.from);
        const [x2, y2] = px(s.to);
        const x = lerp(x1, x2, s.u);
        const y = lerp(y1, y2, s.u);
        const tail = Math.max(0, s.u - 0.45);
        const tx = lerp(x1, x2, tail);
        const ty = lerp(y1, y2, tail);
        const alpha = headlineCalm(x, y, w, h);
        const color = s.target === null ? INK.glow : INK.amber;
        const trail = ctx.createLinearGradient(tx, ty, x, y);
        trail.addColorStop(0, rgba(color, 0));
        trail.addColorStop(1, rgba(color, 0.7 * alpha));
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        glow(ctx, color, x, y, s.target === null ? 13 : 20, alpha);
      }

      for (const node of team) {
        const [x, y] = px(node);
        glow(ctx, INK.amber, x, y, 34, 0.45);
        ring(ctx, x, y, 8, rgba(INK.amber, 0.7), 1.3);
      }
      for (const a of arrivals) {
        const [x, y] = px(a.node);
        const u = a.age / 1.3;
        ring(ctx, x, y, 8 + u * 38, rgba(INK.starTop, 0.8 * (1 - u)), 1.3);
        glow(ctx, INK.starTop, x, y, 50, 1 - u);
      }
    },
  };
}
