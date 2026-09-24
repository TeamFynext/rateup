import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
  stripeProductsQueryOptions,
  stripeSubscriptionsQueryOptions,
  type StripeProduct,
  type StripeSubscription,
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
import { PageHeading } from "@/components/ds/page-heading";
import { PageTabs } from "@/components/ds/page-tabs";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { formatDate, formatMoney, humanize } from "@/lib/format";

const TABS = ["products", "subscriptions"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_app/billing/stripe")({
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined) }),
  component: StripePage,
});

function StripePage() {
  const { tab = "products" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Stripe"
        description="Synced products and live subscriptions."
        actions={<SyncButton gateway="stripe" />}
      />
      <PageTabs<Tab>
        value={tab}
        onChange={(next) =>
          void navigate({
            search: { tab: next === "products" ? undefined : next },
            replace: true,
            resetScroll: false,
          })
        }
        tabs={[
          { value: "products", label: "Products", content: <ProductsTab /> },
          { value: "subscriptions", label: "Subscriptions", content: <SubscriptionsTab /> },
        ]}
      />
    </div>
  );
}

const productColumns: Column<StripeProduct>[] = [
  {
    key: "name",
    header: "Product",
    primary: true,
    cell: (product) => (
      <span className="block min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{product.name}</span>
          {!product.liveMode && <Pill tone="warning">Test</Pill>}
        </span>
        <Mono>{product.productId}</Mono>
      </span>
    ),
  },
  {
    key: "price",
    header: "Price",
    cell: (product) => (
      <span className="tabular">
        {formatMoney(product.amount, product.currency)}
        {product.type === "recurring" &&
          ` / ${product.intervalCount > 1 ? `${product.intervalCount} ` : ""}${product.interval}`}
      </span>
    ),
  },
  { key: "tier", header: "Catalogue tier", cell: (product) => <TierLink tier={product.tier} /> },
  {
    key: "status",
    header: "Status",
    cell: (product) => <PlanStatusPill status={product.status} />,
  },
  {
    key: "stripe",
    header: "On Stripe",
    hideBelow: "lg",
    cell: (product) => (
      <span className="text-muted-foreground">
        {product.active ? "Active" : "Archived"} · {humanize(product.type)}
      </span>
    ),
  },
  {
    key: "created",
    header: "Created",
    hideBelow: "xl",
    cell: (product) => (
      <span className="text-muted-foreground">{formatDate(product.createdAt)}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    cell: (product) => <GatewayRowMenu gateway="stripe" row={product} />,
  },
];

function ProductsTab() {
  const query = useQuery(stripeProductsQueryOptions);
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No Stripe products synced"
        description="Products appear here once they are synced from Stripe."
      />
    );
  }
  return (
    <ResponsiveTable rows={query.data} columns={productColumns} rowKey={(product) => product.id} />
  );
}

const subscriptionColumns: Column<StripeSubscription>[] = [
  {
    key: "id",
    header: "Subscription",
    primary: true,
    cell: (sub) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{sub.productName}</span>
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
        {formatDate(sub.startsAt)} – {formatDate(sub.endsAt)}
      </span>
    ),
  },
];

function SubscriptionsTab() {
  const query = useQuery(stripeSubscriptionsQueryOptions);
  return (
    <div className="flex flex-col gap-4">
      <LiveNote>
        Read live from Stripe: the most recent subscriptions on the account. Ones whose product was
        never synced here are left out.
      </LiveNote>
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No subscriptions on Stripe" />
      ) : (
        <ResponsiveTable rows={query.data} columns={subscriptionColumns} rowKey={(sub) => sub.id} />
      )}
    </div>
  );
}
