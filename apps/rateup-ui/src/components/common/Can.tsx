import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/usePermission.ts";
import type { Permission } from "@/utils/authz/permissions.ts";

interface CanProps {
  /** One permission, or a list of which any suffices. */
  permission: Permission | readonly Permission[];
  children: ReactNode;
  /** Rendered when the user lacks the permission; nothing by default. */
  fallback?: ReactNode;
}

/** Renders its children only when the signed-in user holds the permission. */
export function Can({ permission, children, fallback = null }: Readonly<CanProps>) {
  const { can, canAny } = usePermissions();
  const allowed = Array.isArray(permission) ? canAny(permission) : can(permission as Permission);
  return <>{allowed ? children : fallback}</>;
}
