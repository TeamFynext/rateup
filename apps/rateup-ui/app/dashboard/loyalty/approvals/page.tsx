"use client";

import { useMemo, useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Check, Download, Filter, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ApprovalRequest,
  ApprovalRequestType,
  ApprovalStatus,
} from "@/backend/loyalty/approval/approval.api";
import {
  useApproveApprovalRequest,
  useGetApprovalRequests,
  useRejectApprovalRequest,
} from "@/backend/loyalty/approval/approval.query";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper function to format request type
const formatRequestType = (type: ApprovalRequestType): string => {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to format points
const formatPoints = (points: number | null | undefined): string => {
  if (!points) return "0";
  return points > 0 ? `+${points}` : `${points}`;
};

export default function ApprovalsPage() {
  const t = useTranslations();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | undefined>(
    "PENDING",
  );
  const [currentUserId] = useState("cb5d861c-9b5b-41bc-afdb-bd94c0e85306"); // Replace with actual user ID from auth
  const [currentUserName] = useState("Admin User"); // Replace with actual user name from auth

  const { data: approvalsResponse, isLoading } = useGetApprovalRequests({
    status: statusFilter,
    page: 1,
    limit: 100,
  });

  const approveMutation = useApproveApprovalRequest();
  const rejectMutation = useRejectApprovalRequest();

  // Extract approval requests from response
  const approvals = approvalsResponse?.data || [];

  const handleApprove = async (approvalId: string) => {
    await approveMutation.mutateAsync({
      approvalId,
      data: {
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        notes: "Approved via dashboard",
      },
    });
  };

  const handleReject = async (approvalId: string) => {
    await rejectMutation.mutateAsync({
      approvalId,
      data: {
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        reason: "Rejected by admin",
      },
    });
  };

  const columns: ColumnDef<ApprovalRequest>[] = useMemo(
    () => [
      {
        accessorKey: "account.contact.name",
        id: "customerName",
        header: createSortableHeader(t("Customer")),
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("customerName")}</div>
        ),
        meta: { title: t("Customer") },
      },
      {
        accessorKey: "requestType",
        header: createSortableHeader(t("Request Type")),
        cell: ({ row }) => {
          const requestType = row.getValue(
            "requestType",
          ) as ApprovalRequestType;
          const colors = {
            REWARD_REDEMPTION:
              "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
            POINTS_ADJUSTMENT:
              "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
            TIER_OVERRIDE:
              "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
            ACCOUNT_SUSPENSION:
              "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
            ACCOUNT_REACTIVATION:
              "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
            BULK_OPERATION:
              "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
          };
          return (
            <Badge
              className={`${colors[requestType] || ""} hover:bg-opacity-10 border`}
            >
              {t(formatRequestType(requestType))}
            </Badge>
          );
        },
        meta: { title: t("Request Type") },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "points",
        header: createSortableHeader(t("Points")),
        cell: ({ row }) => {
          const points = row.original.points;
          const formatted = formatPoints(points);
          return (
            <span
              className={
                formatted.startsWith("+")
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : formatted.startsWith("-")
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "font-medium"
              }
            >
              {formatted}
            </span>
          );
        },
        meta: { title: t("Points") },
      },
      {
        accessorKey: "reason",
        header: t("Reason"),
        cell: ({ row }) => (
          <div className="max-w-xs truncate">{row.getValue("reason")}</div>
        ),
        meta: { title: t("Reason") },
      },
      {
        accessorKey: "requestedByName",
        header: createSortableHeader(t("Requested By")),
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            <div>{row.original.requestedByName || "N/A"}</div>
            <div className="text-xs text-muted-foreground/70">
              {row.original.requestedByType}
            </div>
          </div>
        ),
        meta: { title: t("Requested By") },
      },
      {
        accessorKey: "createdAt",
        header: createSortableHeader(t("Date")),
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {new Date(row.getValue("createdAt")).toLocaleDateString()}
          </div>
        ),
        meta: { title: t("Date") },
      },
      {
        id: "actions",
        header: t("Actions"),
        cell: ({ row }) => {
          const status = row.original.status;

          if (status !== "PENDING") {
            const statusColors = {
              APPROVED:
                "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
              REJECTED:
                "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
              EXPIRED:
                "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
              CANCELLED:
                "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
            };
            return (
              <Badge
                className={`${statusColors[status as keyof typeof statusColors] || ""} hover:bg-opacity-10 border`}
              >
                {t(status)}
              </Badge>
            );
          }

          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                onClick={() => handleApprove(row.original.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                {t("Approve")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                onClick={() => handleReject(row.original.id)}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-1" />
                )}
                {t("Reject")}
              </Button>
            </div>
          );
        },
      },
    ],
    [t, approveMutation.isPending, rejectMutation.isPending],
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );

  return (
    <div className="h-full relative space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl mb-1">{t("Approvals")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Review and approve pending requests")}
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Pending Approvals")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvals.filter((item) => item.status === "PENDING").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("Awaiting review")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Total Points Pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvals
                .filter((item) => item.status === "PENDING")
                .reduce((sum, approval) => {
                  return sum + (approval.points || 0);
                }, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("Net change")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("Total Requests")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvalsResponse?.pagination?.total || approvals.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("All time")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DataTable */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={approvals} />
      )}
    </div>
  );
}
