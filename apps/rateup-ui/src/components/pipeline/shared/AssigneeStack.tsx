import { useTranslation } from "react-i18next";

import type { PipelineUser } from "@/backend/pipeline/pipeline.types.ts";
import { cn } from "@/lib/utils";

import { LeadAvatar } from "./LeadAvatar.tsx";

const OVERFLOW_TEXT = {
  sm: "size-5 text-[6px]",
  md: "size-7 text-[9px]",
  lg: "size-8 text-[10px]",
} as const;

interface AssigneeStackProps {
  assignees: PipelineUser[];
  /**
   * Whoever opened the lead. Shown first and ringed in amber, whether or not
   * they are also assigned — the owner is who brought the lead in, which stays
   * worth seeing after they have handed the work to someone else.
   */
  owner?: PipelineUser | null;
  size?: keyof typeof OVERFLOW_TEXT;
  /** Faces shown before the rest collapse into a +N chip. */
  max?: number;
  className?: string;
}

/**
 * The people working a lead, as overlapping monograms. Anyone past `max` is
 * summarised so a card's footer stays the same width however many are assigned.
 */
export function AssigneeStack({
  assignees,
  owner,
  size = "sm",
  max = 3,
  className,
}: Readonly<AssigneeStackProps>) {
  const { t } = useTranslation();
  // The owner leads the stack and never doubles up when they are assigned too.
  const people = owner ? [owner, ...assignees.filter((user) => user.id !== owner.id)] : assignees;

  if (people.length === 0) return null;

  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;

  return (
    <span
      className={cn("flex shrink-0 items-center", className)}
      title={people
        .map((user) => {
          const name = user.name ?? t("Teammate");
          return user.id === owner?.id ? t("{name} (owner)", { name }) : name;
        })
        .join(", ")}
    >
      {shown.map((user) => (
        <LeadAvatar
          key={user.id}
          name={user.name}
          photo={user.profilePhoto}
          tone="person"
          colorKey={user.id}
          size={size}
          className={cn(
            "-ml-1.5 rounded-full ring-2 first:ml-0",
            user.id === owner?.id ? "ring-amber-500 dark:ring-amber-400" : "ring-card",
          )}
        />
      ))}
      {hidden > 0 ? (
        <span
          className={cn(
            "bg-muted text-muted-foreground ring-card -ml-1.5 flex items-center justify-center rounded-full font-semibold ring-2",
            OVERFLOW_TEXT[size],
          )}
        >
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}
