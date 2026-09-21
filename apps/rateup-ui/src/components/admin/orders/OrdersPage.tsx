// Extracted verbatim from the `/admin/orders/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconBuilding,
  IconCalendar,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
  IconUserCheck,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePaymentOrders } from "@/backend/payment/payment.query";
import { DataTableToolbar } from "@/components/admin/orders/data-table-toolbar.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { isInLastSevenDays, isThisMonth, isToday, isYesterday } from "@/utils/dateTime.ts";

/** A payment order as returned by the admin orders endpoint. */
interface RawOrder {
  id: string;
  name?: string;
  subscriptionId?: string;
  status?: string;
  createdAt: string;
  org?: { name?: string };
  createdBy?: { name?: string; email?: string };
}

interface OrderTableData {
  id: string;
  name: string;
  orgname: string;
  subId: string;
  status: string;
  createdBy: string;
  createdAt: string;
  rawCreatedAt: string;
}

export function OrdersPage() {
  const { data: allOrders, isFetched, isLoading, isError } = usePaymentOrders();
  const { t: translations } = useTranslation();

  const [, setOrderStats] = useState({
    today: 0,
    yesterday: 0,
    lastWeek: 0,
    thisMonth: 0,
  });

  const columns: ColumnDef<OrderTableData>[] = [
    {
      accessorKey: "id",
      header: "Razorpay Order ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
          {row.getValue("id")}
        </div>
      ),
      meta: { title: "Razorpay Order ID" },
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconReceipt className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
      meta: { title: "Name" },
    },
    {
      accessorKey: "orgname",
      header: createSortableHeader("Organization Name"),
      cell: ({ row }) => {
        const orgName = String(row.getValue("orgname") ?? "");
        const isDeleted = orgName === "DELETED ORG";
        return (
          <div className="flex items-center gap-2">
            <IconBuilding className="h-4 w-4 text-muted-foreground" />
            <span className={isDeleted ? "text-destructive italic" : ""}>{orgName}</span>
          </div>
        );
      },
      meta: { title: "Organization Name" },
    },
    {
      accessorKey: "subId",
      header: "Subscription ID",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconPackage className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs max-w-[150px] truncate">{row.getValue("subId")}</span>
        </div>
      ),
      meta: { title: "Subscription ID" },
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const status = String(row.getValue("status") ?? "");
        const getStatusColor = () => {
          switch (status?.toLowerCase()) {
            case "paid":
            case "completed":
            case "success":
              return "default";
            case "pending":
            case "processing":
              return "secondary";
            case "failed":
            case "cancelled":
              return "destructive";
            default:
              return "outline";
          }
        };

        return <Badge variant={getStatusColor()}>{status || "Unknown"}</Badge>;
      },
      meta: { title: "Status" },
    },
    {
      accessorKey: "createdBy",
      header: createSortableHeader("Ordered By"),
      cell: ({ row }) => {
        const createdBy = String(row.getValue("createdBy") ?? "");
        const isDeleted = createdBy === "DELETED";
        return (
          <div className="flex items-center gap-2">
            <IconUserCheck className="h-4 w-4 text-muted-foreground" />
            <span
              className={`text-sm max-w-[180px] truncate ${isDeleted ? "text-destructive italic" : ""}`}
            >
              {createdBy}
            </span>
          </div>
        );
      },
      meta: { title: "Ordered By" },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Ordered At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdAt")}</span>
        </div>
      ),
      meta: { title: "Ordered At" },
    },
  ];

  useEffect(() => {
    if (allOrders && isFetched) {
      const today = allOrders.filter((order: RawOrder) => isToday(order.createdAt))?.length || 0;
      const yesterday =
        allOrders.filter((order: RawOrder) => isYesterday(order.createdAt))?.length || 0;
      const lastWeek =
        allOrders.filter((order: RawOrder) => isInLastSevenDays(order.createdAt))?.length || 0;
      const thisMonth =
        allOrders.filter((order: RawOrder) => isThisMonth(order.createdAt))?.length || 0;

      setOrderStats({
        today,
        yesterday,
        lastWeek,
        thisMonth,
      });
    }
  }, [allOrders, isFetched]);

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>An error occurred while loading orders.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <RateupLoader className="h-dvh" />;

  const tableData: OrderTableData[] = isFetched
    ? allOrders?.map((order: RawOrder) => ({
        id: order.id,
        name: order?.name,
        orgname: order?.org?.name || "DELETED ORG",
        subId: order.subscriptionId,
        status: order?.status,
        createdBy: order?.createdBy?.name || order?.createdBy?.email || "DELETED",
        createdAt: dayjs(order.createdAt).format("DD/MM/YYYY HH:mm:ss"),
        rawCreatedAt: order.createdAt,
      }))
    : [];

  // Calculate stats
  // const totalOrders = tableData.length;
  // const paidOrders = tableData.filter((order) =>
  //   ["paid", "completed", "success"].includes(order.status?.toLowerCase()),
  // ).length;
  // const pendingOrders = tableData.filter((order) =>
  //   ["pending", "processing"].includes(order.status?.toLowerCase()),
  // ).length;
  // const failedOrders = tableData.filter((order) =>
  //   ["failed", "cancelled"].includes(order.status?.toLowerCase()),
  // ).length;

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <IconShoppingCart className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">{translations("Orders")}</h1>
            </div>
            <RefreshButton queryKeys={["paymentorders"]} />
          </div>
        </div>

        {/* Stats Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-ru-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Orders
                </CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {totalOrders}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time orders
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-200 dark:border-green-800">
            <div className="absolute inset-0 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid Orders
                </CardTitle>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {paidOrders}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-amber-200 dark:border-amber-800">
            <div className="absolute inset-0 bg-linear-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Orders
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                {pendingOrders}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-destructive/30 ">
            <div className="absolute inset-0 bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20" />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed Orders
                </CardTitle>
                <Badge variant="destructive" className="text-xs px-2 py-0 h-5">
                  Failed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-destructive ">
                {failedOrders}
              </div>
              <p className="text-xs text-destructive mt-1">
                Payment failed
              </p>
            </CardContent>
          </Card>
        </div> */}

        {/* Additional Stats Cards for Date Range */}
        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {orderStats.today}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders Yesterday
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {orderStats.yesterday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {orderStats.lastWeek}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                {orderStats.thisMonth}
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Order Management</h2>
      <p className="text-sm text-muted-foreground">
        Manage and view all payment orders in your system
      </p>
      <DataTable columns={columns} data={tableData} DataTableToolbar={DataTableToolbar} />
    </div>
  );
}
