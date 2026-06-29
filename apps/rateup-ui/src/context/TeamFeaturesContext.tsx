import { createContext, useContext, useMemo } from "react";

import { useMyAllowedFeatures } from "@/backend/team/team.query";
import { useUserInfo } from "@/backend/user/user.query";
import { UserRole } from "@/utils/enums/index.ts";

/**
 * null  → bypass (OWNER / ADMIN / SUPER_ADMIN — no restrictions)
 * Set   → restrict to the features the member's teams have enabled
 */

type AllowedFeatures = Set<string> | null;
interface TeamFeaturesContextValue {
  allowedFeatures: AllowedFeatures;
  isPending: boolean;
}

const TeamFeaturesContext = createContext<TeamFeaturesContextValue | undefined>(undefined);

export function TeamFeaturesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { data: userQueryData, isPending: isUserPending } = useUserInfo();
  const user = userQueryData && "data" in userQueryData ? userQueryData.data : null;
  const hasUser = user !== null;

  // Only SUPER_ADMIN bypasses feature checks.
  const isSuperAdmin = user?.role === UserRole.SUPADM;
  const teamIds = isSuperAdmin ? [] : (user?.teams ?? []);
  const { allowedFeatures: memberFeatures, isPending: featuresPending } =
    useMyAllowedFeatures(teamIds);

  // null means "bypass all checks" for SUPER_ADMIN only.
  let allowedFeatures: AllowedFeatures = null;
  if (hasUser && !isSuperAdmin) {
    allowedFeatures = memberFeatures;
  }
  const isPending = isUserPending || (!hasUser && !isSuperAdmin) || featuresPending;
  const value = useMemo(() => ({ allowedFeatures, isPending }), [allowedFeatures, isPending]);

  return <TeamFeaturesContext.Provider value={value}>{children}</TeamFeaturesContext.Provider>;
}

/**
 * Returns `null` for non-members (bypass) or a `Set<string>` of allowed
 * TeamFeature values for MEMBER-role users.
 *
 * Throws if used outside of `<TeamFeaturesProvider>`.
 */
export function useTeamFeatures(): TeamFeaturesContextValue {
  const ctx = useContext(TeamFeaturesContext);
  if (ctx === undefined) {
    throw new Error("useTeamFeatures must be used inside TeamFeaturesProvider");
  }
  return ctx;
}
