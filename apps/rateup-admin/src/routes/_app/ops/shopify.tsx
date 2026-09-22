import { IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { shopifyStoresQueryOptions, type ShopifyStore } from "@/api/ops.api";
import { OrgLink } from "@/components/billing/gateway-cells";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { PageHeader } from "@/components/shell/page-header";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/ops/shopify")({
  component: ShopifyPage,
});

const COLUMNS: Column<ShopifyStore>[] = [
  {
    key: "shop",
    header: "Store",
    primary: true,
    cell: (store) =>
      store.shop ? (
        <a
          href={`https://${store.shop}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-full items-center gap-1.5 font-medium hover:underline"
        >
          <span className="truncate">{store.shop}</span>
          <IconExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </a>
      ) : (
        <span className="text-muted-foreground">Unknown shop</span>
      ),
  },
  {
    key: "org",
    header: "Organisation",
    cell: (store) => (
      <OrgLink
        org={store.orgId && store.orgName ? { id: store.orgId, name: store.orgName } : null}
        fallback="Not linked to an org"
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (store) => (
      <Pill tone={store.active ? "positive" : "muted"}>{store.active ? "Active" : "Inactive"}</Pill>
    ),
  },
  {
    key: "connected",
    header: "Connected",
    cell: (store) => <span className="text-muted-foreground">{formatDate(store.createdAt)}</span>,
  },
];

function ShopifyPage() {
  const query = useQuery(shopifyStoresQueryOptions);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Shopify" description="Stores that have installed the RateUp app." />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No Shopify stores connected" />
      ) : (
        <ResponsiveTable rows={query.data} columns={COLUMNS} rowKey={(store) => store.id} />
      )}
    </div>
  );
}
