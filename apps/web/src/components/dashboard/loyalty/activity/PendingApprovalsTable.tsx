import { IconCheck } from "@tabler/icons-react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ApprovalRequest, ApprovalRequestType } from "@/backend/loyalty/approval/approval.api";
import {
  useApproveApprovalRequest,
  useGetApprovalRequests,
  useRejectApprovalRequest,
} from "@/backend/loyalty/approval/approval.query";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useUser } from "@/context/UserContext.tsx";

import { PAGE_SIZE } from "./activity.filters.ts";
import { RejectReasonPopover } from "./RejectReasonPopover.tsx";

const REQUEST_LABEL: Record<ApprovalRequestType, string> = {
  REWARD_REDEMPTION: "Reward redemption",
  POINTS_ADJUSTMENT: "Points adjustment",
  TIER_OVERRIDE: "Tier override",
  ACCOUNT_SUSPENSION: "Account suspension",
  ACCOUNT_REACTIVATION: "Account reactivation",
  BULK_OPERATION: "Bulk operation",
};

/**
 * Requests waiting on someone with the right to say yes: staff adjustments, tier
 * overrides, redemptions that need a nod. Approving posts the points at once.
 */
export function PendingApprovalsTable({
  page,
  pointsName,
  onPageChange,
}: Readonly<{ page: number; pointsName: string; onPageChange: (page: number) => void }>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data, isPending } = useGetApprovalRequests({ status: "PENDING", page, limit: PAGE_SIZE });
  const approve = useApproveApprovalRequest();
  const reject = useRejectApprovalRequest();

  const reviewer = {
    reviewerId: user?.userId ?? "",
    reviewerName: user?.userName ?? user?.email ?? "",
  };

  const columns = useMemo<ColumnDef<DataTableFeatures, ApprovalRequest>[]>(
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
        id: "customer",
        header: t("Customer"),
        cell: ({ row }) => {
          const contact = (row.original as { account?: { contact?: { name?: string | null } } })
            .account?.contact;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {contact?.name ?? row.original.customerName ?? t("Unknown")}
              </p>
              <p className="truncate text-xs text-muted-foreground">{row.original.reason}</p>
            </div>
          );
        },
      },
      {
        id: "points",
        header: () => <div className="text-right">{pointsName}</div>,
        cell: ({ row }) => {
          const points = row.original.points ?? 0;
          if (!points) return <div className="text-right text-muted-foreground">—</div>;
          return (
            <div
              className={`text-right tabular-nums font-medium ${points > 0 ? "text-green-700 dark:text-green-500" : "text-destructive"}`}
            >
              {points > 0 ? "+" : "−"}
              {Math.abs(points).toLocaleString()}
            </div>
          );
        },
      },
      {
        id: "type",
        header: t("Type"),
        cell: ({ row }) => (
          <div>
            <Badge
              variant="secondary"
              className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
            >
              {t(REQUEST_LABEL[row.original.requestType] ?? row.original.requestType)}
            </Badge>
            {row.original.requestedByName && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("asked by {name}", { name: row.original.requestedByName })}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const busy =
            (approve.isPending && approve.variables?.approvalId === row.original.id) ||
            (reject.isPending && reject.variables?.approvalId === row.original.id);
          return (
            <div className="flex justify-end gap-2">
              <RejectReasonPopover
                disabled={busy}
                onReject={(reason) =>
                  reject.mutate({ approvalId: row.original.id, data: { ...reviewer, reason } })
                }
              />
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  approve.mutate({
                    approvalId: row.original.id,
                    data: { ...reviewer, notes: t("Approved from Activity") },
                  })
                }
              >
                <IconCheck size={14} />
                {t("Approve")}
              </Button>
            </div>
          );
        },
      },
    ],
    [t, pointsName, approve, reject, reviewer.reviewerId, reviewer.reviewerName],
  );

  const pagination: PaginationState = { pageIndex: page - 1, pageSize: PAGE_SIZE };

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
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
