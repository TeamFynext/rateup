import { useCallback, useRef } from "react";

interface ScrollIntoViewOptions {
  /** Kept for API compatibility; 0 scrolls instantly, anything else smoothly. */
  duration?: number;
  axis?: "x" | "y";
}

/**
 * Replacement for `useScrollIntoView` from `@mantine/hooks`. Attach
 * `scrollableRef` to the scroll container and `targetRef` to the element to
 * bring into view, then call `scrollIntoView()`.
 */
export function useScrollIntoView<
  Target extends HTMLElement = any,
  Scrollable extends HTMLElement = any,
>({ duration = 1250 }: ScrollIntoViewOptions = {}) {
  const targetRef = useRef<Target>(null);
  const scrollableRef = useRef<Scrollable>(null);

  const scrollIntoView = useCallback(
    (params?: { alignment?: "start" | "end" | "center" }) => {
      const target = targetRef.current;
      if (!target) return;

      target.scrollIntoView({
        behavior: duration === 0 ? "auto" : "smooth",
        block: params?.alignment ?? "start",
      });
    },
    [duration],
  );

  const cancel = useCallback(() => {}, []);

  return { scrollIntoView, targetRef, scrollableRef, cancel };
}
