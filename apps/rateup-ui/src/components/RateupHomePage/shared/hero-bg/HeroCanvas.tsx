import { useEffect, useRef } from "react";

import type { HeroScene, SceneFactory } from "./scenes/kit";
import { useHeroLoop } from "./useHeroLoop";

/* Scenes open mid-loop, so the first frame (and the only one under reduced motion) is a field
   already in motion rather than an empty band. */
const WARM_UP_S = 6;
const WARM_UP_STEP = 1 / 30;

interface Live {
  scene: HeroScene;
  ctx: CanvasRenderingContext2D;
  t: number;
  w: number;
  h: number;
}

/** Runs `steps` steps of `dt`, then paints. False once the scene has thrown: the caller drops it,
    because a background must never take the hero down with it. */
function render(live: Live, dt: number, steps = 1) {
  const { scene, ctx } = live;
  try {
    for (let i = 0; i < steps; i++) {
      live.t += dt;
      scene.step(dt, live.t, live.w, live.h);
    }
    ctx.clearRect(0, 0, live.w, live.h);
    ctx.globalCompositeOperation = scene.blend ?? "lighter";
    scene.draw(ctx, live.t, live.w, live.h);
    ctx.globalCompositeOperation = "source-over";
    return true;
  } catch (error) {
    console.error("Hero scene stopped", error);
    return false;
  }
}

/**
 * A canvas scene behind a hero. Fills its nearest positioned ancestor. The server renders an
 * empty canvas over the band's own gradient; the scene paints on mount.
 */
export default function HeroCanvas({
  scene,
  className = "",
}: Readonly<{ scene: SceneFactory; className?: string }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<Live | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const live: Live = { scene: scene(), ctx, t: 0, w: 0, h: 0 };

    const measure = () => {
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const { width, height } = canvas.getBoundingClientRect();
      live.w = width;
      live.h = height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      live.scene.resize?.(width, height);
    };

    measure();
    if (!render(live, WARM_UP_STEP, Math.round(WARM_UP_S / WARM_UP_STEP))) return;
    liveRef.current = live;

    const ro = new ResizeObserver(() => {
      measure();
      if (!render(live, 0, 0)) liveRef.current = null;
    });
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      liveRef.current = null;
    };
  }, [scene]);

  useHeroLoop(canvasRef, (dt) => {
    const live = liveRef.current;
    if (live && !render(live, dt)) liveRef.current = null;
  });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    />
  );
}
