import { IconExternalLink, IconGift, IconStarFilled } from "@tabler/icons-react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  FEEDBACK_REQUEST_STATUSES,
  type FeedbackRequestRow,
  type FeedbackRequestStatus,
} from "@/backend/loyalty/feedback.api.ts";
import { useFeedbackRequests } from "@/backend/loyalty/feedback.query.ts";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { FEEDBACK_PAGE_SIZE, requestsQueryFor, type FeedbackSearch } from "./feedback.search.ts";

const STATUS_LABEL: Record<FeedbackRequestStatus, string> = {
  SCHEDULED: "Scheduled",
  SENT: "Sent",
  COMPLETED: "Answered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

const STATUS_CLASS: Record<FeedbackRequestStatus, string> = {
  SCHEDULED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
  SENT: "bg-primary/10 text-primary",
  COMPLETED: "bg-green-600/10 text-green-700 dark:text-green-500",
  CANCELLED: "text-muted-foreground",
  FAILED: "bg-destructive/10 text-destructive",
};

const ALL = "all";

/** Every ask, newest first — who, what they said, and how far it got. */
export function FeedbackRequestsTable({
  search,
  onSearchChange,
}: Readonly<{
  search: FeedbackSearch;
  onSearchChange: (next: Partial<FeedbackSearch>) => void;
}>) {
  const { t } = useTranslation();
  const { data, isPending } = useFeedbackRequests(requestsQueryFor(search));

  const columns = useMemo<ColumnDef<DataTableFeatures, FeedbackRequestRow>[]>(
    () => [
      {
        id: "customer",
        header: t("Customer"),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{row.original.customerName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.phoneMasked}</p>
          </div>
        ),
      },
      {
        id: "rating",
        header: t("Rating"),
        cell: ({ row }) => {
          const { overallRating, happy } = row.original;
          if (overallRating === null) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 tabular-nums">
                <IconStarFilled size={12} className="text-amber-700 dark:text-amber-500" />
                {overallRating}
              </span>
              {happy !== null && (
                <Badge
                  variant="secondary"
                  className={
                    happy
                      ? "bg-green-600/10 text-green-700 dark:text-green-500"
                      : "text-muted-foreground"
                  }
                >
                  {happy ? t("Happy") : t("Not happy")}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: t("Status"),
        cell: ({ row }) => {
          const { status, failReason, channel } = row.original;
          const hint = failReason ?? (channel ? t("Sent as {channel}", { channel }) : undefined);
          return (
            <Badge variant="secondary" className={STATUS_CLASS[status]} title={hint}>
              {t(STATUS_LABEL[status])}
            </Badge>
          );
        },
      },
      {
        id: "review",
        header: t("Review"),
        cell: ({ row }) => {
          const { reviewClickedAt, rewardGrantedAt } = row.original;
          if (!reviewClickedAt) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <IconExternalLink
                size={14}
                title={t("Opened Google {when}", { when: dayjs(reviewClickedAt).fromNow() })}
              />
              {rewardGrantedAt && (
                <IconGift
                  size={14}
                  className="text-green-700 dark:text-green-500"
                  title={t("Reward granted {when}", { when: dayjs(rewardGrantedAt).fromNow() })}
                />
              )}
            </div>
          );
        },
      },
      {
        id: "when",
        header: t("When"),
        cell: ({ row }) => {
          const { completedAt, sentAt, scheduledFor } = row.original;
          const stamp = completedAt ?? sentAt ?? scheduledFor;
          const label = completedAt ? t("Answered") : sentAt ? t("Sent") : t("Due");
          return (
            <span
              className="text-muted-foreground"
              title={dayjs(stamp).format("D MMM YYYY, h:mm A")}
            >
              {label} {dayjs(stamp).fromNow()}
            </span>
          );
        },
      },
    ],
    [t],
  );

  const pagination: PaginationState = {
    pageIndex: search.page - 1,
    pageSize: FEEDBACK_PAGE_SIZE,
  };
  const statusItems = [
    { value: ALL, label: t("All statuses") },
    ...FEEDBACK_REQUEST_STATUSES.map((status) => ({
      value: status,
      label: t(STATUS_LABEL[status]),
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Select
          value={search.status ?? ALL}
          items={statusItems}
          onValueChange={(value) =>
            onSearchChange({
              // `find` hands back the narrowed member, and undefined for "all".
              status: FEEDBACK_REQUEST_STATUSES.find((status) => status === value),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        isPending={isPending}
        serverSide={{
          pagination,
          onPaginationChange: (updater) => {
            const next = typeof updater === "function" ? updater(pagination) : updater;
            onSearchChange({ page: next.pageIndex + 1 });
          },
          rowCount: data?.total ?? 0,
        }}
      />
    </div>
  );
}
