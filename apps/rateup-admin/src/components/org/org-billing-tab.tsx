import { IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { OrgInvoice } from "@/api/orgs.api";
import { orgInvoicesQueryOptions, orgOrdersQueryOptions } from "@/api/orgs.query";
import { Mono, SubscriptionStatusPill } from "@/components/billing/gateway-cells";
import { LiveNote } from "@/components/billing/live-note";
import { orderColumns } from "@/components/billing/order-columns";
import { Pager } from "@/components/ds/pager";
import { SectionTitle } from "@/components/ds/panel";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { formatDate, formatMoney } from "@/lib/format";

const ORDER_COLUMNS = orderColumns({ withOrg: false });

const fromUnix = (seconds: number | null) => (seconds ? new Date(seconds * 1000) : null);

const INVOICE_COLUMNS: Column<OrgInvoice>[] = [
  {
    key: "invoice",
    header: "Invoice",
    primary: true,
    cell: (invoice) => (
      <span className="block min-w-0">
        <span className="block font-medium tabular">
          {formatMoney(invoice.amount, invoice.currency)}
        </span>
        <Mono>{invoice.id}</Mono>
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (invoice) => <SubscriptionStatusPill status={invoice.status} />,
  },
  {
    key: "period",
    header: "Billing period",
    cell: (invoice) => (
      <span className="text-muted-foreground tabular">
        {formatDate(fromUnix(invoice.billingStart))} – {formatDate(fromUnix(invoice.billingEnd))}
      </span>
    ),
  },
  {
    key: "paid",
    header: "Paid",
    cell: (invoice) => (
      <span className="text-muted-foreground">{formatDate(fromUnix(invoice.paidAt))}</span>
    ),
  },
  {
    key: "link",
    header: "Receipt",
    align: "right",
    cell: (invoice) =>
      invoice.url ? (
        <a
          href={invoice.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs font-medium tracking-wide uppercase hover:underline"
        >
          Open <IconExternalLink className="size-3.5" />
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function OrgBillingTab({ orgId }: { orgId: string }) {
  const [page, setPage] = useState(1);
  const orders = useQuery(orgOrdersQueryOptions(orgId, page));
  const invoices = useQuery(orgInvoicesQueryOptions(orgId));

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <SectionTitle>Orders</SectionTitle>
        {orders.isPending ? (
          <ListSkeleton rows={3} />
        ) : orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
        ) : orders.data.data.length === 0 ? (
          <EmptyState title="No orders" description="This organisation has never checked out." />
        ) : (
          <div className="flex flex-col gap-4">
            <ResponsiveTable
              rows={orders.data.data}
              columns={ORDER_COLUMNS}
              rowKey={(order) => order.id}
            />
            {orders.data.total > orders.data.pageSize && (
              <Pager
                page={orders.data.page}
                pageSize={orders.data.pageSize}
                total={orders.data.total}
                fetching={orders.isPlaceholderData}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <SectionTitle>Invoices</SectionTitle>
        <LiveNote>
          Read live from Razorpay. Stripe and Shopify invoices are not shown here.
        </LiveNote>
        {invoices.isPending ? (
          <ListSkeleton rows={3} />
        ) : invoices.isError ? (
          <ErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />
        ) : invoices.data.length === 0 ? (
          <EmptyState title="No Razorpay invoices" />
        ) : (
          <ResponsiveTable
            rows={invoices.data}
            columns={INVOICE_COLUMNS}
            rowKey={(invoice) => invoice.id}
          />
        )}
      </section>
    </div>
  );
}
