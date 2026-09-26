import { useEffect, useRef, type RefObject } from "react";

const FRAME_MS = 33;

/**
 * Calls `step` with the seconds since the last frame, about 30 times a second, while `target` is
 * on screen and the reader allows motion. `step` may be a new function every render.
 */
export function useHeroLoop(target: RefObject<Element | null>, step: (dtSeconds: number) => void) {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const reduced = globalThis.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let last = 0;
    let visible = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      if (dt < FRAME_MS) return;
      last = now;
      /* rAF stops in a hidden tab, so the first frame back reports the whole absence as one
         step. Clamping it keeps the scene from lurching forward on return. */
      stepRef.current(Math.min(dt, FRAME_MS * 2) / 1000);
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
    io.observe(el);
    reduced.addEventListener("change", sync);

    return () => {
      io.disconnect();
      reduced.removeEventListener("change", sync);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);
}
