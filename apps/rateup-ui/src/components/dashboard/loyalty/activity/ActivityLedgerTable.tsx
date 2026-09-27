import { Link } from "@tanstack/react-router";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  LoyaltyLedgerRow,
  TransactionFilter,
} from "@/backend/loyalty/redemption/redemption.api";
import { useGetTransactions } from "@/backend/loyalty/redemption/redemption.query";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import { PAGE_SIZE } from "./activity.filters.ts";

const KIND_LABEL: Record<string, string> = {
  earn: "Earned",
  redeem: "Redeemed",
  adjust: "Adjusted",
  expire: "Expired",
  refund: "Refunded",
};

const KIND_CLASS: Record<string, string> = {
  earn: "bg-green-600/10 text-green-700 dark:text-green-500",
  redeem: "bg-primary/10 text-primary",
  adjust: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  expire: "text-muted-foreground",
  refund: "text-muted-foreground",
};

/** Every point in and out — the same ledger, unchanged columns. */
export function ActivityLedgerTable({
  filters,
  pointsName,
  currencySymbol,
  onPageChange,
}: Readonly<{
  filters: TransactionFilter;
  pointsName: string;
  currencySymbol: string;
  onPageChange: (page: number) => void;
}>) {
  const { t } = useTranslation();
  const { data, isPending } = useGetTransactions(filters);

  const columns = useMemo<ColumnDef<DataTableFeatures, LoyaltyLedgerRow>[]>(
    () => [
      {
        id: "when",
        accessorKey: "createdAt",
        header: t("When"),
        cell: ({ row }) => (
          <span
            className="text-muted-foreground"
            title={dayjs(row.original.createdAt).format("D MMM YYYY, h:mm A")}
          >
            {dayjs(row.original.createdAt).fromNow()}
          </span>
        ),
      },
      {
        id: "what",
        header: t("Customer"),
        cell: ({ row }) => {
          const meta = row.original.metadata as { purchaseAmount?: unknown } | null | undefined;
          const amount = typeof meta?.purchaseAmount === "number" ? meta.purchaseAmount : null;
          const detail =
            row.original.reward?.name ??
            (amount !== null
              ? t("{symbol}{amount} purchase", {
                  symbol: currencySymbol,
                  amount: amount.toLocaleString(),
                })
              : row.original.description || row.original.source.replaceAll("_", " "));
          const contact = row.original.account?.contact;
          const name = contact?.name ?? t("Unknown");
          return (
            <div className="min-w-0">
              {/* The name opens the member on Customers, the same view their row there
                  opens — a ledger line was a dead end before. Without a number there is
                  nothing to open: the details view is keyed on the phone. */}
              {contact?.phone ? (
                <Link
                  to={LOYALTY_PATHS.customers}
                  search={{ phone: contact.phone }}
                  title={t("Open {name}", { name })}
                  className="block truncate font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {name}
                </Link>
              ) : (
                <p className="truncate font-medium text-foreground">{name}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">{detail}</p>
            </div>
          );
        },
      },
      {
        id: "points",
        accessorKey: "points",
        header: () => <div className="text-right">{pointsName}</div>,
        cell: ({ row }) => {
          const points = row.original.points;
          return (
            <div
              className={`text-right tabular-nums font-medium ${
                points > 0
                  ? "text-green-700 dark:text-green-500"
                  : points < 0
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {points > 0 ? "+" : points < 0 ? "−" : ""}
              {Math.abs(points).toLocaleString()}
            </div>
          );
        },
      },
      {
        id: "type",
        accessorKey: "transactionType",
        header: t("Type"),
        cell: ({ row }) => {
          const kind = row.original.transactionType.toLowerCase();
          return (
            <Badge variant="secondary" className={KIND_CLASS[kind] ?? ""}>
              {t(KIND_LABEL[kind] ?? row.original.transactionType)}
            </Badge>
          );
        },
      },
    ],
    [t, pointsName, currencySymbol],
  );

  const pagination: PaginationState = { pageIndex: (filters.page ?? 1) - 1, pageSize: PAGE_SIZE };

  return (
    <DataTable
      columns={columns}
      data={data?.transactions ?? []}
      isPending={isPending}
      serverSide={{
        pagination,
        onPaginationChange: (updater) => {
          const next = typeof updater === "function" ? updater(pagination) : updater;
          onPageChange(next.pageIndex + 1);
        },
        rowCount: data?.pagination.total ?? 0,
      }}
    />
  );
}
