"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { fbPageview } from "./fbpixel";

export default function RouteChangeHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Analytics: fire fbPageview when in production
      if (process.env.NODE_ENV === "production") {
        fbPageview();
      }
    }, 200); // adjust timing if needed

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return null;
}
