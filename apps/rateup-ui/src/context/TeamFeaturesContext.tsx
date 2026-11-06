import { createContext, useContext, useMemo } from "react";

import { usePermissions } from "@/hooks/usePermission.ts";
import type { TeamFeature } from "@/types/enums.ts";
import { allowedFeaturesFromPermissions } from "@/utils/authz/features.ts";

/**
 * The modules the signed-in user may open, derived from their permissions. `null` keeps
 * the old meaning of "no restriction" for org-wide roles, so the navigation and the route
 * guard read it unchanged.
 */
export type AllowedFeatures = Set<TeamFeature> | null;
interface TeamFeaturesContextValue {
  allowedFeatures: AllowedFeatures;
  isPending: boolean;
}

const TeamFeaturesContext = createContext<TeamFeaturesContextValue | undefined>(undefined);

export function TeamFeaturesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { permissions, seesAllTeams, roleKey, isPending } = usePermissions();

  const value = useMemo<TeamFeaturesContextValue>(() => {
    const orgWide = seesAllTeams && (roleKey === "OWNER" || roleKey === "ADMIN");
    return {
      allowedFeatures: orgWide ? null : allowedFeaturesFromPermissions(permissions),
      isPending,
    };
  }, [permissions, seesAllTeams, roleKey, isPending]);

  return <TeamFeaturesContext.Provider value={value}>{children}</TeamFeaturesContext.Provider>;
}

/** Throws if used outside of `<TeamFeaturesProvider>`. */
export function useTeamFeatures(): TeamFeaturesContextValue {
  const ctx = useContext(TeamFeaturesContext);
  if (ctx === undefined) {
    throw new Error("useTeamFeatures must be used inside TeamFeaturesProvider");
  }
  return ctx;
}
