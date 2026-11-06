import { Link } from "@tanstack/react-router";

import type { GatewayPlanStatus, LinkedTier, OrgRef } from "@/api/billing.api";
import { Pill, type PillTone } from "@/components/ds/pill";
import { humanize } from "@/lib/format";

/** Our own flag on a synced gateway plan: ACTIVE / LIVE sell, the rest do not. */
export function PlanStatusPill({ status }: { status: GatewayPlanStatus }) {
  const live = status === "ACTIVE" || status === "LIVE";
  return <Pill tone={live ? "positive" : "muted"}>{humanize(status)}</Pill>;
}

const SUBSCRIPTION_TONES: Record<string, PillTone> = {
  active: "positive",
  paid: "positive",
  issued: "warning",
  authenticated: "positive",
  trialing: "positive",
  pending: "warning",
  past_due: "warning",
  halted: "negative",
  unpaid: "negative",
  cancelled: "muted",
  canceled: "muted",
  completed: "muted",
  expired: "muted",
};

/** A gateway subscription's own status, as Razorpay or Stripe reports it. */
export function SubscriptionStatusPill({ status }: { status: string }) {
  return <Pill tone={SUBSCRIPTION_TONES[status] ?? "outline"}>{humanize(status)}</Pill>;
}

export function TierLink({ tier }: { tier: LinkedTier | null }) {
  if (!tier) return <span className="text-muted-foreground">Not linked</span>;
  return (
    <Link to="/billing/plans" className="relative z-10 font-medium hover:underline">
      {tier.name}
    </Link>
  );
}

/** Links to the org; raised above a row-link overlay so it stays clickable. */
export function OrgLink({ org, fallback }: { org: OrgRef | null; fallback?: string | null }) {
  if (!org) return <span className="text-muted-foreground">{fallback ?? "Unknown"}</span>;
  return (
    <Link
      to="/orgs/$orgId"
      params={{ orgId: org.id }}
      className="relative z-10 font-medium hover:underline"
    >
      {org.name}
    </Link>
  );
}

export function Mono({ children }: { children: string | null | undefined }) {
  if (!children) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs">{children}</span>;
}
