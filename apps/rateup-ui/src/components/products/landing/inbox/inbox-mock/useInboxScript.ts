import { useEffect, useReducer, useRef, useState } from "react";

import { useIsomorphicLayoutEffect } from "@/components/RateupHomePage/shared/home-ui";

import { FINAL, INITIAL, type MockState, SCRIPT, advance } from "./script";

type Action = "advance" | "reset";

const reducer = (state: MockState, action: Action): MockState =>
  action === "reset" ? INITIAL : advance(state);

/**
 * Plays the scripted conversation while the mock is on screen.
 *
 * It starts from `FINAL`, so the server and a reader without JS get the finished conversation;
 * the rewind to `INITIAL` happens in the first client layout pass, before paint — the same
 * order `useReveal` uses, and what keeps the thread from flashing its ending first.
 */
export function useInboxScript<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, dispatch] = useReducer(reducer, FINAL);
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
    const id = globalThis.setTimeout(() => dispatch("advance"), SCRIPT[state.step].delay);
    return () => globalThis.clearTimeout(id);
  }, [running, state.step]);

  return [ref, state] as const;
}
