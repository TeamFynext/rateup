import { useMemo } from "react";

import { useLoggedInUser } from "@/api/api";

/** Mirrors `ORG_MODULES` in rateup-api/src/modules/org/modules.ts. */
export type OrgModule = "pipeline" | "loyalty" | "commerce" | "web_forms" | "qr_links" | "ai_agent";

/**
 * Areas the org has hidden in Settings → Features, from `GET /api/user/info`. Hiding is
 * navigation only, so an older API that sends no list leaves everything on.
 */
export function useOrgModules() {
  const { data: user } = useLoggedInUser();
  const hidden: unknown = user?.hiddenModules;

  return useMemo(() => {
    const off = new Set(Array.isArray(hidden) ? hidden.map(String) : []);
    return { isOn: (module: OrgModule) => !off.has(module) };
  }, [hidden]);
}
