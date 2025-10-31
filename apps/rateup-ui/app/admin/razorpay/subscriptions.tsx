"use client";

import React from "react";

import { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Package,
  Play,
  Square,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { usePaymentSubcription } from "../../../backend/payment/payment.query";
import RefreshButton from "../../../components/Button/RefreshButton";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import { SubscriptionsDataTableToolbar } from "./subscriptions-data-table-toolbar";

interface SubscriptionTableData {
  id: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  start: string;
  end: string;
}

const RazorpaySubscriptions = () => {
  const { data: subscriptions, isFetched, isLoading } = usePaymentSubcription();
  const translations = useTranslations();

  const columns: ColumnDef<SubscriptionTableData>[] = [
    {
      accessorKey: "id",
      header: "Razorpay Subscription ID",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
          {row.getValue("id")}
        </div>
      ),
    },
    {
      accessorKey: "planName",
      header: createSortableHeader("Plan Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("planName")}</span>
        </div>
      ),
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
    },
    {
      accessorKey: "currency",
      header: "Currency",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.getValue("currency")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const getStatusIcon = () => {
          switch (status.toLowerCase()) {
            case "active":
              return <Play className="h-3 w-3" />;
            case "completed":
              return <Square className="h-3 w-3" />;
            default:
              return null;
          }
        };

        const getStatusColor = () => {
          switch (status.toLowerCase()) {
            case "active":
              return "default";
            case "completed":
              return "secondary";
            case "cancelled":
              return "destructive";
            default:
              return "outline";
          }
        };

        return (
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {status}
          </Badge>
        );
      },
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
    },
    {
      accessorKey: "start",
      header: createSortableHeader("Starts At"),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("start")}</span>
      ),
    },
    {
      accessorKey: "end",
      header: createSortableHeader("Ends At"),
      cell: ({ row }) => <span className="text-sm">{row.getValue("end")}</span>,
    },
  ];

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const tableData: SubscriptionTableData[] = isFetched ? subscriptions : [];

  // Calculate stats
  const totalSubscriptions = tableData.length;
  const activeSubscriptions = tableData.filter(
    (sub) => sub.status.toLowerCase() === "active",
  ).length;
  const completedSubscriptions = tableData.filter(
    (sub) => sub.status.toLowerCase() === "completed",
  ).length;
  const cancelledSubscriptions = tableData.filter(
    (sub) => sub.status.toLowerCase() === "cancelled",
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
                {translations("List of Subscriptions from Razorpay DB")}
              </CardTitle>
            </div>
            <RefreshButton queryKeys={["paymentsubscription"]} />
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Active
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
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {completedSubscriptions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cancelledSubscriptions}
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

export default RazorpaySubscriptions;
