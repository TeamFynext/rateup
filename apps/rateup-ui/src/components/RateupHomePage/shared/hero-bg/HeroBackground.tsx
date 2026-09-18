import { useEffect, useId, useRef } from "react";

import {
  LOOP_S,
  STATIC_T,
  VIEW_H,
  VIEW_W,
  buildDots,
  buildLines,
  dotOpacity,
  dotTransform,
  glowOffset,
  pathD,
} from "./lineField";

const FRAME_MS = 33;
/* Fraction of the authored pace. The piece was cut as a 12s loop for a preview; behind a
   headline that reads as busy, so the page runs it at 40% — one lap every 30s. */
const SPEED = 0.4;
const LINE_OPACITY = 0.42;

const STATIC_LINES = buildLines(STATIC_T);
const STATIC_DOTS = buildDots(STATIC_LINES, STATIC_T);

/* Phones draw every other line: the field is cropped to a narrow slice there, and half the
   paths is half the per-frame work. The markup is the same everywhere so SSR still matches. */
const sparseClass = (line: number) => (line % 2 === 1 ? "max-sm:hidden" : "");

const glowTransform = (T: number) => {
  const { x, y } = glowOffset(T);
  return `translate3d(${(x - 50).toFixed(2)}%, ${(y - 50).toFixed(2)}%, 0)`;
};

/**
 * The navy line field behind the hero. Fills its nearest positioned ancestor.
 *
 * React renders one frame and never re-renders: a single rAF loop writes the moving attributes
 * through refs, so the landing route is not reconciling ~80 SVG nodes every frame. That first
 * frame is also what the server, a no-JS reader and `prefers-reduced-motion` all get.
 */
export default function HeroBackground({ className = "" }: Readonly<{ className?: string }>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const dotRefs = useRef<Array<SVGGElement | null>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = globalThis.matchMedia("(max-width: 639px)");

    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let visible = false;

    const draw = (T: number) => {
      const sparse = narrow.matches;
      const lines = buildLines(T);
      lines.forEach((line, i) => {
        if (sparse && i % 2 === 1) return;
        pathRefs.current[i]?.setAttribute("d", pathD(line));
      });
      buildDots(lines, T).forEach((dot, i) => {
        if (sparse && dot.line % 2 === 1) return;
        const el = dotRefs.current[i];
        if (!el) return;
        el.setAttribute("transform", dotTransform(dot));
        el.setAttribute("opacity", dotOpacity(dot));
      });
      if (glowRef.current) glowRef.current.style.transform = glowTransform(T);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      if (dt < FRAME_MS) return;
      last = now;
      /* rAF stops in a hidden tab, so the first frame back reports the whole absence as one
         step. Clamping it keeps the field from lurching forward on return. */
      elapsed += (Math.min(dt, FRAME_MS * 2) / 1000) * SPEED;
      draw((STATIC_T + elapsed) % LOOP_S);
    };

    const sync = () => {
      const shouldRun = visible && !reduced.matches;
      if (shouldRun && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!shouldRun && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(root);
    reduced.addEventListener("change", sync);

    return () => {
      io.disconnect();
      reduced.removeEventListener("change", sync);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const lineGradient = `${id}-line`;
  const glowGradient = `${id}-glow`;
  const warmGradient = `${id}-warm`;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        ref={glowRef}
        className="absolute top-[58%] left-[66%] h-[104%] w-[92%] bg-radial-[closest-side] from-ru-glow/16 to-transparent to-70%"
        style={{ transform: glowTransform(STATIC_T) }}
      />

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full text-ru-blue-400"
      >
        <defs>
          <linearGradient id={lineGradient} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.18" stopColor="currentColor" />
            <stop offset="0.82" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={glowGradient}>
            <stop offset="0" stopOpacity="0.55" className="[stop-color:var(--color-ru-glow)]" />
            <stop offset="1" stopOpacity="0" className="[stop-color:var(--color-ru-glow)]" />
          </radialGradient>
          <radialGradient id={warmGradient}>
            <stop
              offset="0"
              stopOpacity="0.55"
              className="[stop-color:var(--color-ru-amber-500)]"
            />
            <stop offset="1" stopOpacity="0" className="[stop-color:var(--color-ru-amber-500)]" />
          </radialGradient>
        </defs>

        <g fill="none" stroke={`url(#${lineGradient})`} strokeLinecap="round">
          {STATIC_LINES.map((line, i) => (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={pathD(line)}
              strokeWidth={line.width}
              opacity={(LINE_OPACITY * line.alpha).toFixed(3)}
              className={`[vector-effect:non-scaling-stroke] ${sparseClass(i)}`}
              suppressHydrationWarning
            />
          ))}
        </g>

        {STATIC_DOTS.map((dot, i) => (
          <g
            key={i}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            transform={dotTransform(dot)}
            opacity={dotOpacity(dot)}
            className={sparseClass(dot.line)}
            suppressHydrationWarning
          >
            <circle r={dot.r * 6} fill={`url(#${dot.warm ? warmGradient : glowGradient})`} />
            <circle r={dot.r} className={dot.warm ? "fill-ru-amber-500" : "fill-ru-glow"} />
            <circle r={dot.r * 0.5} className={dot.warm ? "fill-ru-star-top" : "fill-white"} />
          </g>
        ))}
      </svg>
    </div>
  );
}
