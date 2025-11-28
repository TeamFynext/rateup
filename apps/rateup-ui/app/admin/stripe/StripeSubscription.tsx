"use client";

import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Package,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useGetAllStripeSubscriptions } from "../../../backend/payment/stripe/stripe.query";
import RefreshButton from "../../../components/Button/RefreshButton";
import { SubscriptionsDataTableToolbar } from "./subscriptions-data-table-toolbar";

interface SubscriptionTableData {
  id: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  startsAt: string;
  endsAt: string;
}

const StripeSubscription = () => {
  const translations = useTranslations();
  const { data: subscriptions } = useGetAllStripeSubscriptions();

  const columns: ColumnDef<SubscriptionTableData>[] = [
    {
      accessorKey: "id",
      header: "Subscription ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
          {row.getValue("id")}
        </div>
      ),
      meta: { title: "Subscription ID" },
    },
    {
      accessorKey: "productName",
      header: createSortableHeader("Product Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("productName")}</span>
        </div>
      ),
      meta: { title: "Product Name" },
    },
    {
      accessorKey: "amount",
      header: createSortableHeader("Amount"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{row.getValue("amount")}</span>
        </div>
      ),
      meta: { title: "Amount" },
    },
    {
      accessorKey: "currency",
      header: "Currency",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.getValue("currency")}
        </Badge>
      ),
      meta: { title: "Currency" },
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const getStatusIcon = () => {
          switch (status.toLowerCase()) {
            case "active":
            case "trialing":
              return <Play className="h-3 w-3" />;
            case "paused":
              return <Pause className="h-3 w-3" />;
            case "canceled":
            case "incomplete":
              return <Square className="h-3 w-3" />;
            default:
              return null;
          }
        };

        const getStatusColor = () => {
          if (["active", "trialing"].includes(status.toLowerCase())) {
            return "default";
          }
          return "destructive";
        };

        return (
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {status}
          </Badge>
        );
      },
      meta: { title: "Status" },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Created At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdAt")}</span>
        </div>
      ),
      meta: { title: "Created At" },
    },
    {
      accessorKey: "startsAt",
      header: createSortableHeader("Starts At"),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("startsAt")}</span>
      ),
      meta: { title: "Starts At" },
    },
    {
      accessorKey: "endsAt",
      header: createSortableHeader("Ends At"),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("endsAt")}</span>
      ),
      meta: { title: "Ends At" },
    },
  ];

  const tableData: SubscriptionTableData[] = subscriptions
    ? subscriptions?.map((sub) => ({
        ...sub,
        createdAt: dayjs.unix(sub.createdAt).format("DD/MM/YYYY HH:mm:ss"),
        startsAt: dayjs.unix(sub.startsAt).format("DD/MM/YYYY HH:mm:ss"),
        endsAt: dayjs.unix(sub.endsAt).format("DD/MM/YYYY HH:mm:ss"),
      }))
    : [];

  // Calculate stats
  const totalSubscriptions = tableData.length;
  const activeSubscriptions = tableData.filter((sub) =>
    ["active", "trialing"].includes(sub.status.toLowerCase()),
  ).length;
  const inactiveSubscriptions = tableData.filter(
    (sub) => !["active", "trialing"].includes(sub.status.toLowerCase()),
  ).length;

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
                {translations("List of subscriptions from stripe DB")}
              </CardTitle>
            </div>
            <RefreshButton queryKeys={["stripeSubscriptions"]} />
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeSubscriptions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inactiveSubscriptions}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        DataTableToolbar={SubscriptionsDataTableToolbar}
      />
    </div>
  );
};

export default StripeSubscription;
