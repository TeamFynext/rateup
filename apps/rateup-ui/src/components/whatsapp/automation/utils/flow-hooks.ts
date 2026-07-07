import { useCallback, useEffect, useMemo, useRef } from "react";

/** Debounces a callback; the returned function resets the timer on each call. */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: A) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}

type Hotkey = [combo: string, handler: (e: KeyboardEvent) => void];

/** Minimal hotkey hook. Supports combos like "mod+z", "shift+mod+z", "mod+y". */
export function useHotkeys(hotkeys: Hotkey[]) {
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  // Stable key derived from the combos so the effect doesn't re-bind every render.
  const combosKey = useMemo(() => hotkeys.map(([c]) => c).join("|"), [hotkeys]);

  useEffect(() => {
    const matches = (combo: string, e: KeyboardEvent) => {
      const parts = combo.toLowerCase().split("+");
      const key = parts[parts.length - 1];
      const needMod = parts.includes("mod");
      const needShift = parts.includes("shift");
      const needAlt = parts.includes("alt");
      const mod = e.ctrlKey || e.metaKey;
      return (
        e.key.toLowerCase() === key &&
        needMod === mod &&
        needShift === e.shiftKey &&
        needAlt === e.altKey
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      for (const [combo, handler] of hotkeysRef.current) {
        if (matches(combo, e)) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [combosKey]);
}
