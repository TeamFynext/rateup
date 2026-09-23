import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
  razorpayPlansQueryOptions,
  razorpaySubscriptionsQueryOptions,
  type RazorpayPlan,
  type RazorpaySubscription,
} from "@/api/billing.api";
import { GatewayRowMenu, SyncButton } from "@/components/billing/gateway-actions";
import {
  Mono,
  OrgLink,
  PlanStatusPill,
  SubscriptionStatusPill,
  TierLink,
} from "@/components/billing/gateway-cells";
import { LiveNote } from "@/components/billing/live-note";
import { PageTabs } from "@/components/ds/page-tabs";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { PageHeader } from "@/components/shell/page-header";
import { formatDate, formatMoney } from "@/lib/format";

const TABS = ["plans", "subscriptions"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_app/billing/razorpay")({
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined) }),
  component: RazorpayPage,
});

function RazorpayPage() {
  const { tab = "plans" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Razorpay"
        description="Gateway plans and live subscriptions."
        actions={<SyncButton gateway="razorpay" />}
      />
      <PageTabs<Tab>
        value={tab}
        onChange={(next) =>
          void navigate({
            search: { tab: next === "plans" ? undefined : next },
            replace: true,
            // A tab is not a new page; jumping to the top would lose the reader's place.
            resetScroll: false,
          })
        }
        tabs={[
          { value: "plans", label: "Plans", content: <PlansTab /> },
          { value: "subscriptions", label: "Subscriptions", content: <SubscriptionsTab /> },
        ]}
      />
    </div>
  );
}

const planColumns: Column<RazorpayPlan>[] = [
  {
    key: "name",
    header: "Plan",
    primary: true,
    cell: (plan) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{plan.name}</span>
        <Mono>{plan.planId}</Mono>
      </span>
    ),
  },
  {
    key: "price",
    header: "Price",
    cell: (plan) => (
      <span className="tabular">
        {formatMoney(plan.amount, plan.currency)} / {plan.interval > 1 ? `${plan.interval} ` : ""}
        {plan.period.replace(/ly$/, "")}
      </span>
    ),
  },
  { key: "tier", header: "Catalogue tier", cell: (plan) => <TierLink tier={plan.tier} /> },
  { key: "status", header: "Status", cell: (plan) => <PlanStatusPill status={plan.status} /> },
  {
    key: "created",
    header: "Created",
    hideBelow: "lg",
    cell: (plan) => <span className="text-muted-foreground">{formatDate(plan.createdAt)}</span>,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    cell: (plan) => <GatewayRowMenu gateway="razorpay" row={plan} />,
  },
];

function PlansTab() {
  const query = useQuery(razorpayPlansQueryOptions);
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No Razorpay plans synced"
        description="Plans appear here once they are synced from Razorpay."
      />
    );
  }
  return <ResponsiveTable rows={query.data} columns={planColumns} rowKey={(plan) => plan.id} />;
}

const subscriptionColumns: Column<RazorpaySubscription>[] = [
  {
    key: "id",
    header: "Subscription",
    primary: true,
    cell: (sub) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{sub.planName ?? "Unknown plan"}</span>
        <Mono>{sub.id}</Mono>
      </span>
    ),
  },
  { key: "org", header: "Organisation", cell: (sub) => <OrgLink org={sub.org} /> },
  {
    key: "amount",
    header: "Amount",
    cell: (sub) => <span className="tabular">{formatMoney(sub.amount, sub.currency)}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (sub) => <SubscriptionStatusPill status={sub.status} />,
  },
  {
    key: "period",
    header: "Current period",
    cell: (sub) => (
      <span className="text-muted-foreground tabular">
        {formatDate(sub.start)} – {formatDate(sub.end)}
      </span>
    ),
  },
  {
    key: "created",
    header: "Created",
    hideBelow: "xl",
    cell: (sub) => <span className="text-muted-foreground">{formatDate(sub.createdAt)}</span>,
  },
];

function SubscriptionsTab() {
  const query = useQuery(razorpaySubscriptionsQueryOptions);
  return (
    <div className="flex flex-col gap-4">
      <LiveNote>
        Read live from Razorpay: the most recent subscriptions on the account, not a full history.
        The organisation is matched from our own records where one exists.
      </LiveNote>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No subscriptions on Razorpay" />
      ) : (
        <ResponsiveTable rows={query.data} columns={subscriptionColumns} rowKey={(sub) => sub.id} />
      )}
    </div>
  );
}
