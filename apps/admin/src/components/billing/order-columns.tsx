import type { OrderRow, OrderStatus } from "@/api/billing.api";
import { Pill, type PillTone } from "@/components/ds/pill";
import type { Column } from "@/components/ds/responsive-table";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";

import { Mono, OrgLink } from "./gateway-cells";

const ORDER_TONES: Record<OrderStatus, PillTone> = {
  COMPLETE: "positive",
  PENDING: "warning",
  FAILED: "negative",
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={ORDER_TONES[status]}>{humanize(status)}</Pill>;
}

const GATEWAY_LABELS = { razorpay: "Razorpay", stripe: "Stripe", shopify: "Shopify" } as const;

/** Checkout columns; `withOrg` is off on an org's own page, where the org is implied. */
export function orderColumns({ withOrg }: { withOrg: boolean }): Column<OrderRow>[] {
  const columns: (Column<OrderRow> | false)[] = [
    {
      key: "name",
      header: "Order",
      primary: true,
      cell: (order) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{order.plan?.name ?? order.name}</span>
          <Mono>{order.subscriptionId ?? order.id}</Mono>
        </span>
      ),
    },
    withOrg && {
      key: "org",
      header: "Organisation",
      cell: (order) => <OrgLink org={order.org} fallback={order.deletedOrgName ?? "Deleted org"} />,
    },
    {
      key: "gateway",
      header: "Gateway",
      cell: (order) => (order.gateway ? GATEWAY_LABELS[order.gateway] : "—"),
    },
    {
      key: "amount",
      header: "Paid",
      cell: (order) =>
        order.payment ? (
          <span className="tabular">
            {formatMoney(order.payment.amount, order.payment.currency)}
            <span className="ml-1 text-xs text-muted-foreground">{order.payment.method}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "status", header: "Status", cell: (order) => <OrderStatusPill status={order.status} /> },
    {
      key: "by",
      header: "Ordered by",
      hideBelow: "xl",
      cell: (order) => (
        <span className="text-muted-foreground">{order.createdBy?.email ?? "—"}</span>
      ),
    },
    {
      key: "created",
      header: "Ordered",
      hideBelow: "lg",
      cell: (order) => (
        <span className="text-muted-foreground tabular">{formatDateTime(order.createdAt)}</span>
      ),
    },
  ];
  return columns.filter((column): column is Column<OrderRow> => Boolean(column));
}
