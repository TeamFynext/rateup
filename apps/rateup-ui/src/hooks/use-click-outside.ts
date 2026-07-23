import { useEffect, useRef } from "react";

const DEFAULT_EVENTS = ["mousedown", "touchstart"];

/**
 * Replacement for `useClickOutside` from `@mantine/hooks`. Returns a ref to
 * attach to the element; `handler` fires on a pointer press outside of it.
 */
export function useClickOutside<T extends HTMLElement = any>(
  handler: () => void,
  events: string[] | null = DEFAULT_EVENTS,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: Event) => {
      const target = event.target as Node | null;
      if (!target || !document.body.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) handler();
    };

    const names = events ?? DEFAULT_EVENTS;
    names.forEach((name) => document.addEventListener(name, listener));
    return () => names.forEach((name) => document.removeEventListener(name, listener));
  }, [handler, events]);

  return ref;
}
