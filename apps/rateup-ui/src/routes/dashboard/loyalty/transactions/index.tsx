"use client";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Download, Filter, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGetTransactions } from "@/backend/loyalty/redemption/redemption.query";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { docsPath } from "@/utils/constants.ts";

export const Route = createFileRoute("/dashboard/loyalty/transactions/")({
  component: TransactionsPage,
});

interface Transaction {
  id: string;
  customerName: string;
  type: "Earn" | "Redeem" | "Adjust" | "Expire" | "Refund";
  points: string;
  description: string;
  date: string;
  status: string;
}

function CustomerCell({ customerName }: { customerName: string }) {
  return <div className="font-medium">{customerName}</div>;
}

function TypeCell({ type }) {
  const colorMap: Record<string, string> = {
    Earn: "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 border border-green-500/20",
    Redeem:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 border border-purple-500/20",
    Adjust:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20",
    Expire:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10 border border-orange-500/20",
    Refund:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/20",
  };

  return <Badge className={colorMap[type] || colorMap.Earn}>{type}</Badge>;
}

function PointsCell({ points }: { points: string }) {
  return (
    <span
      className={
        String(points).startsWith("-")
          ? "text-purple-600 dark:text-purple-400 font-medium"
          : "text-green-600 dark:text-green-400 font-medium"
      }
    >
      {points}
    </span>
  );
}

function DescriptionCell({ description }: { description: string }) {
  return <div>{description}</div>;
}

function DateCell({ createdAt }: { createdAt: Date }) {
  return (
    <div className="text-muted-foreground">{dayjs(createdAt).fromNow()}</div>
  );
}

function TransactionsPage() {
  const { t } = useTranslation();
  const [filters] = useState({});

  const { data: transactionsData, isLoading } = useGetTransactions(filters);

  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        accessorKey: "account.contact.name",
        id: "customerName",
        header: createSortableHeader(t("Customer")),
        cell: ({ row }) =>
          CustomerCell({ customerName: row.getValue("customerName") }),
        meta: { title: t("Customer") },
      },
      {
        accessorKey: "transactionType",
        header: createSortableHeader(t("Type")),
        cell: ({ row }) => TypeCell({ type: row.getValue("transactionType") }),
        meta: { title: t("Type") },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "points",
        header: createSortableHeader(t("Points")),
        cell: ({ row }) => PointsCell({ points: row.getValue("points") }),
        meta: { title: t("Points") },
      },
      {
        accessorKey: "description",
        header: t("Description"),
        cell: ({ row }) =>
          DescriptionCell({ description: row.getValue("description") }),
        meta: { title: t("Description") },
      },
      {
        accessorKey: "createdAt",
        header: createSortableHeader(t("Date")),
        cell: ({ row }) => DateCell({ createdAt: row.getValue("createdAt") }),
        meta: { title: t("Date") },
      },
      // {
      //   accessorKey: "status",
      //   header: createSortableHeader(t("Status")),
      //   cell: ({ row }) => StatusCell({ status: row.getValue("status"), t }),
      //   meta: { title: t("Status") },
      // },
      // {
      //   id: "actions",
      //   header: t("Action"),
      //   cell: () => ActionCell({ t }),
      // },
    ],
    [t],
  );

  return (
    <div className="h-full relative">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl mb-1">{t("Transactions")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("View all loyalty point transactions")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            {t("Filter")}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t("Export")}
          </Button>
          <InfoButton docUrl={`${docsPath}/loyality/transctions`} />
        </div>
      </div>
      {/* DataTable */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={transactionsData?.transactions || []}
        />
      )}
    </div>
  );
}
