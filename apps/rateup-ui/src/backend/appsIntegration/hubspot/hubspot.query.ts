import { useQuery } from "@tanstack/react-query";

import { IntegratedApps } from "@/types/enums.ts";

import { getHubSpotStatus } from "./hubspot.api";

/** Under `integrationKeys.byType("hubspot")`, so a connect or disconnect invalidation reaches it. */
const hubSpotKeys = {
  status: () => ["integrations", IntegratedApps.hubspot, "status"] as const,
};

export function useHubSpotStatus() {
  return useQuery({ queryKey: hubSpotKeys.status(), queryFn: getHubSpotStatus });
}
