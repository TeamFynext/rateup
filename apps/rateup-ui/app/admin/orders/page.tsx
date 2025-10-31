"use client";

import { useEffect, useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  Building2,
  Calendar,
  Package,
  Receipt,
  ShoppingCart,
  UserCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { usePaymentOrders } from "@/backend/payment/payment.query";
import RefreshButton from "@/components/Button/RefreshButton";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  isInLastSevenDays,
  isThisMonth,
  isToday,
  isYesterday,
} from "../../../utils/dateTime";
import { DataTableToolbar } from "./data-table-toolbar";

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

const Orders = () => {
  const { data: allOrders, isFetched, isLoading, isError } = usePaymentOrders();
  const translations = useTranslations();

  const [orderStats, setOrderStats] = useState({
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
    },
    {
      accessorKey: "name",
      header: createSortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "orgname",
      header: createSortableHeader("Organization Name"),
      cell: ({ row }) => {
        const orgName = row.getValue("orgname") as string;
        const isDeleted = orgName === "DELETED ORG";
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className={isDeleted ? "text-red-500 italic" : ""}>
              {orgName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "subId",
      header: "Subscription ID",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs max-w-[150px] truncate">
            {row.getValue("subId")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
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
    },
    {
      accessorKey: "createdBy",
      header: createSortableHeader("Ordered By"),
      cell: ({ row }) => {
        const createdBy = row.getValue("createdBy") as string;
        const isDeleted = createdBy === "DELETED";
        return (
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <span
              className={`text-sm max-w-[180px] truncate ${isDeleted ? "text-red-500 italic" : ""}`}
            >
              {createdBy}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: createSortableHeader("Ordered At"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.getValue("createdAt")}</span>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (allOrders && isFetched) {
      const today =
        allOrders.filter((order) => isToday(order.createdAt))?.length || 0;
      const yesterday =
        allOrders.filter((order) => isYesterday(order.createdAt))?.length || 0;
      const lastWeek =
        allOrders.filter((order) => isInLastSevenDays(order.createdAt))
          ?.length || 0;
      const thisMonth =
        allOrders.filter((order) => isThisMonth(order.createdAt))?.length || 0;

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
            <CardDescription>
              An error occurred while loading orders.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const tableData: OrderTableData[] = isFetched
    ? allOrders?.map((order) => ({
        id: order.id,
        name: order?.name,
        orgname: order?.org?.name || "DELETED ORG",
        subId: order.subscriptionId,
        status: order?.status,
        createdBy:
          order?.createdBy?.name || order?.createdBy?.email || "DELETED",
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
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {translations("Orders")}
              </h1>
            </div>
            <RefreshButton queryKeys={["paymentorders"]} />
          </div>
        </div>

        {/* Stats Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
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
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" />
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
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" />
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

          <Card className="relative overflow-hidden border-red-200 dark:border-red-800">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20" />
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
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {failedOrders}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
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
      <DataTable
        columns={columns}
        data={tableData}
        DataTableToolbar={DataTableToolbar}
      />
    </div>
  );
};

export default Orders;
