import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Replacement for `useDebouncedState` from `@mantine/hooks`. The returned value
 * only updates after `wait` ms of quiet; the setter is called eagerly.
 */
export function useDebouncedState<T>(defaultValue: T, wait: number, options = { leading: false }) {
  const [value, setValue] = useState(defaultValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadingRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const debouncedSetValue = useCallback(
    (newValue: React.SetStateAction<T>) => {
      clearTimer();
      if (leadingRef.current && options.leading) {
        setValue(newValue);
      } else {
        timeoutRef.current = setTimeout(() => {
          leadingRef.current = true;
          setValue(newValue);
        }, wait);
      }
      leadingRef.current = false;
    },
    [options.leading, wait, clearTimer],
  );

  return [value, debouncedSetValue] as const;
}

/**
 * Replacement for `useDebouncedValue` from `@mantine/hooks`. Mirrors an
 * upstream value, delayed by `wait` ms.
 */
export function useDebouncedValue<T>(value: T, wait: number): [T, () => void] {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setDebounced(value), wait);
    return cancel;
  }, [value, wait, cancel]);

  return [debounced, cancel];
}
