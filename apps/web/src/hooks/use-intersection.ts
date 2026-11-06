import { useCallback, useRef, useState } from "react";

/**
 * Replacement for `useIntersection` from `@mantine/hooks`. Attach the returned
 * `ref` to the element to observe; `entry` is the latest IntersectionObserver
 * entry for it.
 */
export function useIntersection<T extends HTMLElement = HTMLElement>(
  options?: ConstructorParameters<typeof IntersectionObserver>[1],
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (element: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!element) {
        setEntry(null);
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([firstEntry]) => setEntry(firstEntry),
        options,
      );
      observerRef.current.observe(element);
    },
    [options?.rootMargin, options?.root, options?.threshold],
  );

  return { ref, entry };
}
