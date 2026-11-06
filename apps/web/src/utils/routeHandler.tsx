import { useRouterState, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

import { fbPageview } from "./fbpixel.ts";

export default function RouteChangeHandler(): null {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const searchParams = useSearch({ strict: false });

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Analytics: fire fbPageview when in production
      if (import.meta.env.NODE_ENV === "production") {
        fbPageview();
      }
    }, 200); // adjust timing if needed

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return null;
}
