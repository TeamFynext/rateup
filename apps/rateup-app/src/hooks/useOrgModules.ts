import { useMemo } from "react";

import { useLoggedInUser } from "@/api/api";

/** Mirrors `ORG_MODULES` in rateup-api/src/modules/org/modules.ts. */
export type OrgModule = "pipeline" | "loyalty" | "commerce" | "web_forms" | "qr_links" | "ai_agent";

/** Feature areas the org has hidden from navigation. An older API sends none, so all show. */
export function useOrgModules() {
  const { data: user } = useLoggedInUser();
  const hidden: unknown = user?.hiddenModules;

  return useMemo(() => {
    const hiddenModules = new Set(Array.isArray(hidden) ? hidden : []);
    return { isOn: (module: OrgModule) => !hiddenModules.has(module) };
  }, [hidden]);
}
