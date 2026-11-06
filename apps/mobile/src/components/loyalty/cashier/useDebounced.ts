import { useEffect, useState } from "react";

/**
 * `value`, held back until it has stopped changing for `delay`.
 *
 * The customer search fires a request per keystroke otherwise, and at the counter the
 * number is typed fast — the web has `use-debounce.ts` for the same reason; this app had
 * no equivalent.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
