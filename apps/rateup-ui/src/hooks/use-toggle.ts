import { useCallback, useRef, useState } from "react";

/**
 * Replacement for `useToggle` from `@mantine/hooks`. Cycles through `options`;
 * calling the setter with a value jumps straight to it.
 */
export function useToggle<T = boolean>(options: readonly T[] = [false, true] as any) {
  const [state, setState] = useState<T>(options[0]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const toggle = useCallback((value?: React.SetStateAction<T>) => {
    setState((current) => {
      if (value !== undefined) {
        return typeof value === "function" ? (value as (prev: T) => T)(current) : value;
      }
      const list = optionsRef.current;
      const index = list.indexOf(current);
      return list[(index + 1) % list.length];
    });
  }, []);

  return [state, toggle] as const;
}
