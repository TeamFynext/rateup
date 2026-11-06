import type { Prisma } from "../../generated/prisma/client.js";
import type { Permission } from "./permissions.js";
import { legacyRolesWith } from "./roles.js";

/**
 * The `where` fragment that picks every member holding a permission, overrides included:
 * their role carries it and it was not taken away, or it was granted by hand.
 */
export function recipientsWhere(permission: Permission): Prisma.OrgMemberWhereInput {
  return {
    OR: [
      {
        role: { in: legacyRolesWith(permission) },
        NOT: { permissionDenies: { has: permission } },
      },
      { permissionGrants: { has: permission } },
    ],
  };
}
