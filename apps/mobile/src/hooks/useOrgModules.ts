import { useMemo } from "react";

import { useLoggedInUser } from "@/api/api";

/** Mirrors `ORG_MODULES` in apps/api/src/modules/settings/org/modules.ts. */
export type OrgModule = "pipeline" | "loyalty" | "commerce" | "web_forms" | "qr_links" | "ai_agent";

/**
 * Feature areas the org has hidden in Settings → Features, from `GET /api/user/info`.
 * Hiding is navigation only, so an older API that sends no list leaves everything on.
 */
export function useOrgModules() {
  const { data: user } = useLoggedInUser();
  const hidden: unknown = user?.hiddenModules;

  return useMemo(() => {
    const hiddenModules = new Set(Array.isArray(hidden) ? hidden.map(String) : []);
    return { isOn: (module: OrgModule) => !hiddenModules.has(module) };
  }, [hidden]);
}
