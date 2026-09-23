import { IconExternalLink, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { orgSubscriptionQueryOptions } from "@/api/org-actions.api";
import type { OrgInvoice } from "@/api/orgs.api";
import {
  orgInvoicesQueryOptions,
  orgOrdersQueryOptions,
  orgUsageQueryOptions,
} from "@/api/orgs.query";
import { Mono, SubscriptionStatusPill } from "@/components/billing/gateway-cells";
import { LiveNote } from "@/components/billing/live-note";
import { orderColumns } from "@/components/billing/order-columns";
import { DetailList } from "@/components/ds/detail-list";
import { SectionHeading } from "@/components/ds/page-heading";
import { Pager } from "@/components/ds/pager";
import { Panel } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import type { OrgAction } from "@/components/org/actions/org-action-dialogs";
import { FeaturesSummary } from "@/components/org/features-summary";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney, formatRelative, isEffectivelyNever } from "@/lib/format";

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

export function OrgBillingTab({
  orgId,
  onAction,
}: {
  orgId: string;
  onAction: (action: OrgAction) => void;
}) {
  const [page, setPage] = useState(1);
  const orders = useQuery(orgOrdersQueryOptions(orgId, page));
  const invoices = useQuery(orgInvoicesQueryOptions(orgId));

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SubscriptionPanel orgId={orgId} onAction={onAction} />
        <PacksPanel orgId={orgId} onAction={onAction} />
      </div>

      <section className="flex flex-col gap-5">
        <SectionHeading>Orders</SectionHeading>
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
        <SectionHeading>Invoices</SectionHeading>
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

const actionButton = "h-9 rounded-lg px-4";

function SubscriptionPanel({
  orgId,
  onAction,
}: {
  orgId: string;
  onAction: (action: OrgAction) => void;
}) {
  const query = useQuery(orgSubscriptionQueryOptions(orgId));
  const subscription = query.data;

  return (
    <Panel className="flex flex-col gap-6">
      <SectionHeading>Subscription</SectionHeading>
      {query.isPending ? (
        <ListSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <DetailList
          items={[
            { label: "Plan", value: subscription?.plan?.name ?? "No plan" },
            {
              label: "Expires",
              value: !subscription
                ? null
                : isEffectivelyNever(subscription.expiresAt)
                  ? "Never"
                  : `${formatDate(subscription.expiresAt)} (${formatRelative(subscription.expiresAt)})`,
            },
            {
              label: "Billed by",
              value: subscription?.gatewayRef ? (
                <Mono>{subscription.gatewayRef}</Mono>
              ) : (
                "Nobody: set by hand"
              ),
            },
            {
              label: "Limits",
              value: subscription?.contractedCap ? (
                <Pill tone="warning">Contracted cap</Pill>
              ) : (
                "As the plan, or edited here"
              ),
            },
          ]}
        />
      )}
      {subscription && <FeaturesSummary subscription={subscription} className="border-t pt-5" />}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button className={actionButton} onClick={() => onAction({ kind: "plan" })}>
          Change plan
        </Button>
        <Button
          variant="outline"
          className={actionButton}
          disabled={!subscription}
          onClick={() => onAction({ kind: "expiry" })}
        >
          Change expiry
        </Button>
        <Button
          variant="outline"
          className={actionButton}
          disabled={!subscription}
          onClick={() => onAction({ kind: "limits" })}
        >
          Edit limits
        </Button>
      </div>
    </Panel>
  );
}

/** Packs in date. Only staff grants can be ended here; a paid one is refunded in the gateway. */
function PacksPanel({ orgId, onAction }: { orgId: string; onAction: (action: OrgAction) => void }) {
  const query = useQuery(orgUsageQueryOptions(orgId));
  const packs = query.data?.packs ?? [];

  return (
    <Panel className="flex flex-col gap-6">
      <SectionHeading
        action={
          <Button
            variant="outline"
            className="h-9 rounded-xl px-3"
            onClick={() => onAction({ kind: "grant-packs" })}
          >
            <IconPlus />
            Grant
          </Button>
        }
      >
        Conversation packs
      </SectionHeading>
      {query.isPending ? (
        <ListSkeleton rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : packs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No packs in date.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {packs.map((pack) => {
            const granted = pack.paymentRef?.startsWith("staff:") ?? false;
            const label = `${pack.quantity} × ${pack.name}`;
            return (
              <li key={pack.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {label}
                    <Pill tone={granted ? "muted" : "positive"}>
                      {granted ? "Granted" : "Paid"}
                    </Pill>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(pack.boughtAt)} → runs out {formatDate(pack.expiresAt)}
                  </p>
                </div>
                {granted && (
                  <Button
                    variant="ghost"
                    className="h-9 shrink-0 rounded-xl px-3 text-xs font-medium tracking-wide text-negative uppercase"
                    onClick={() => onAction({ kind: "revoke-pack", addonId: pack.id, label })}
                  >
                    End
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
