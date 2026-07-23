import { useCallback, useState } from "react";

interface CounterOptions {
  min?: number;
  max?: number;
}

export interface CounterHandlers {
  increment: () => void;
  decrement: () => void;
  set: (value: number) => void;
  reset: () => void;
}

const clamp = (value: number, { min, max }: CounterOptions) => {
  let next = value;
  if (typeof min === "number") next = Math.max(next, min);
  if (typeof max === "number") next = Math.min(next, max);
  return next;
};

/** Replacement for `useCounter` from `@mantine/hooks`. */
export function useCounter(
  initialValue = 0,
  options: CounterOptions = {},
): [number, CounterHandlers] {
  const [count, setCount] = useState(clamp(initialValue, options));

  const increment = useCallback(
    () => setCount((c) => clamp(c + 1, options)),
    [options.min, options.max],
  );
  const decrement = useCallback(
    () => setCount((c) => clamp(c - 1, options)),
    [options.min, options.max],
  );
  const set = useCallback(
    (value: number) => setCount(clamp(value, options)),
    [options.min, options.max],
  );
  const reset = useCallback(
    () => setCount(clamp(initialValue, options)),
    [initialValue, options.min, options.max],
  );

  return [count, { increment, decrement, set, reset }];
}
