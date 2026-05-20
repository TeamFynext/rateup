"use client";

import { createContext, useContext } from "react";

import { useMyAllowedFeatures } from "@/backend/team/team.query";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";

/**
 * null  → bypass (OWNER / ADMIN / SUPER_ADMIN — no restrictions)
 * Set   → restrict to the features the member's teams have enabled
 */

type AllowedFeatures = Set<string> | null;
type TeamFeaturesContextValue = {
  allowedFeatures: AllowedFeatures;
  isPending: boolean;
};

const TeamFeaturesContext = createContext<TeamFeaturesContextValue | undefined>(
  undefined,
);

export function TeamFeaturesProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = useUser();

  // Only SUPER_ADMIN bypasses feature checks; all other roles are restricted.
  const isSuperAdmin = user?.role === UserRole.SUPADM;
  const teamIds = isSuperAdmin ? [] : (user?.teams ?? []);
  const { allowedFeatures: memberFeatures, isPending } =
    useMyAllowedFeatures(teamIds);

  // null means "bypass all checks" for super admins only
  const allowedFeatures: AllowedFeatures = isSuperAdmin ? null : memberFeatures;

  return (
    <TeamFeaturesContext.Provider value={{ allowedFeatures, isPending }}>
      {children}
    </TeamFeaturesContext.Provider>
  );
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
