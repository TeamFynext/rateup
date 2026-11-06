import { useEffect, useReducer, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "@/components/RateupHomePage/shared/home-ui";

export interface ScriptStep<S> {
  /** How long the state before this step is held. */
  delay: number;
  apply: (state: S) => S;
}

export interface Script<S extends { step: number }> {
  initial: S;
  /** What the server, a no-JS reader and `prefers-reduced-motion` get: the finished story. */
  final: S;
  steps: readonly ScriptStep<S>[];
}

/** Applies the current step; a step that returns `initial` loops the story. */
export function advanceScript<S extends { step: number }>(script: Script<S>, state: S): S {
  const next = script.steps[state.step].apply(state);
  return next === script.initial ? script.initial : { ...next, step: state.step + 1 };
}

/**
 * Plays a scripted mock while it is on screen and the tab is visible.
 *
 * It starts from `final`, so the server and a reader without JS get the finished story; the
 * rewind to `initial` happens in the first client layout pass, before paint — the same order
 * `useReveal` uses, and what keeps the mock from flashing its ending first.
 */
export function useScript<S extends { step: number }, T extends HTMLElement = HTMLDivElement>(
  script: Script<S>,
) {
  const ref = useRef<T>(null);
  const [state, dispatch] = useReducer(
    (current: S, action: "advance" | "reset"): S =>
      action === "reset" ? script.initial : advanceScript(script, current),
    script.final,
  );
  const [running, setRunning] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    dispatch("reset");

    let onScreen = false;
    const sync = () => setRunning(onScreen && document.visibilityState === "visible");
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = globalThis.setTimeout(() => dispatch("advance"), script.steps[state.step].delay);
    return () => globalThis.clearTimeout(id);
  }, [running, state.step, script]);

  return [ref, state] as const;
}
