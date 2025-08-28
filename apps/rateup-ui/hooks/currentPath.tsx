"use client";

import { usePathname, useSearchParams } from "next/navigation";

export function useCurrentPath() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Combine pathname + query string
  const fullPath =
    pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

  return fullPath;
}
