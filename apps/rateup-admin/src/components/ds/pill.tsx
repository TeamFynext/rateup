import type { ReactNode } from "react";

import type { SubscriptionStatus } from "@/api/orgs.api";
import { daysUntil, isEffectivelyNever } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PillTone = "ink" | "muted" | "positive" | "negative" | "warning" | "outline";

const TONES: Record<PillTone, string> = {
  ink: "bg-primary text-primary-foreground",
  muted: "bg-muted text-muted-foreground",
  positive: "bg-positive/10 text-positive",
  negative: "bg-negative/10 text-negative",
  warning: "bg-tone-peach text-tone-peach-accent",
  outline: "border text-foreground",
};

/** The reference's small rounded status label. */
export function Pill({
  tone = "muted",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Where an org's subscription stands, with an "expires in N days" warning when it is close. */
export function SubscriptionPill({
  status,
  expiresAt,
}: {
  status: SubscriptionStatus;
  expiresAt: string | null;
}) {
  if (status === "no_plan") return <Pill tone="outline">No plan</Pill>;
  if (status === "expired") return <Pill tone="negative">Expired</Pill>;

  const days = daysUntil(expiresAt);
  if (days !== null && days <= 14 && !isEffectivelyNever(expiresAt)) {
    return (
      <Pill tone="warning">
        {days <= 0 ? "Expires today" : `Expires in ${days} ${days === 1 ? "day" : "days"}`}
      </Pill>
    );
  }
  return <Pill tone="positive">Active</Pill>;
}

export function PlanPill({ plan }: { plan: { name: string; paid: boolean } | null }) {
  if (!plan) return <span className="text-muted-foreground">—</span>;
  return <Pill tone={plan.paid ? "ink" : "muted"}>{plan.name}</Pill>;
}
