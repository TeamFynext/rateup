import {
  IconCrown,
  IconEye,
  IconHeadset,
  IconShield,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { resolveRoleKey } from "@/utils/authz/can.ts";
import { ROLE_META, type RoleKey } from "@/utils/authz/roles.ts";

/**
 * One swatch per role, warm for the org-wide roles and cool for the team-scoped ones, so a
 * roster reads at a glance who reaches every team.
 */
const ROLE_STYLE: Record<RoleKey, { icon: typeof IconCrown; className: string }> = {
  OWNER: {
    icon: IconCrown,
    className: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  },
  ADMIN: { icon: IconShield, className: "bg-primary/10 text-primary dark:bg-primary/20" },
  MANAGER: {
    icon: IconUsersGroup,
    className: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  },
  STAFF: { icon: IconUser, className: "bg-muted text-foreground" },
  AGENT: {
    icon: IconHeadset,
    className: "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
  },
  VIEWER: { icon: IconEye, className: "bg-muted text-muted-foreground" },
};

interface RoleBadgeProps {
  /** The system role key, or, for older rows, the legacy role string. */
  roleKey?: string | null;
  role?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function roleLabel(roleKey: RoleKey, t: (key: string) => string): string {
  return t(ROLE_META[roleKey].label);
}

export function RoleBadge({ roleKey, role, className, size = "md" }: Readonly<RoleBadgeProps>) {
  const { t } = useTranslation();
  const key = resolveRoleKey({ roleKey, role });
  if (!key) return null;
  const { icon: Icon, className: tone } = ROLE_STYLE[key];
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-transparent font-medium",
        tone,
        size === "sm" && "h-5 px-1.5 text-[11px]",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden="true" />
      {roleLabel(key, t)}
    </Badge>
  );
}
