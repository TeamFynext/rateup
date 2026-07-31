import type { ColumnDef, PaginationState, Updater } from "@tanstack/react-table";
import type { PaginationState, Updater } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Megaphone,
  MessageCircle,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useExportWaMessageLogs,
  useWaMessageLogs,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { AnalyticsDateRange } from "@/types/api.ts";

function MessageLogs({ dateRange }: { dateRange: AnalyticsDateRange }) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(
    () => ({
      dateKey: dateRange.key,
      dateRange: dateRange.range,
      status: selectedStatus,
      source: selectedSource,
      team: selectedTeamId,
      searchQuery: debouncedSearch,
      pagination,
    }),
    [dateRange, selectedStatus, selectedSource, selectedTeamId, debouncedSearch, pagination],
  );
  const { data: messageLogsData, isLoading } = useWaMessageLogs(params);
  const { mutate: exportLogs, isPending: isExporting } = useExportWaMessageLogs();

  const handlePaginationChange = useCallback((updater: Updater<PaginationState>) => {
    setPagination((prev) => {
      const newPagination = typeof updater === "function" ? updater(prev) : updater;
      return newPagination;
    });
  }, []);

  const filteredData = messageLogsData?.data || [];

  function formatLabel(value?: string) {
    if (!value) return t("Export");
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function getSourceBadge(source?: string) {
    const formatted = formatLabel(source);

    if (formatted === "Inbox") {
      return {
        className: "bg-blue-50 dark:bg-transparent text-blue-700 border-blue-200",
        icon: <MessageCircle className="w-3 h-3 mr-1" />,
      };
    }

    if (formatted === "Campaign") {
      return {
        className: "bg-orange-50 dark:bg-transparent text-orange-700 border-orange-200",
        icon: <Megaphone className="w-3 h-3 mr-1" />,
      };
    }

    if (formatted === "Template") {
      return {
        className: "bg-purple-50 dark:bg-transparent text-purple-700 border-purple-200",
        icon: <Megaphone className="w-3 h-3 mr-1" />,
      };
    }

    return {
      className: "bg-gray-50 dark:bg-transparent text-gray-600 border-gray-200",
      icon: null,
    };
  }

  function getStatusBadge(status?: string) {
    const s = status || "unknown";

    if (s === "delivered") {
      return {
        className: "bg-green-50 dark:bg-transparent text-green-700 border-green-200",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      };
    }

    if (s === "sent") {
      return {
        className: "bg-blue-50 dark:bg-transparent text-blue-700 border-blue-200",
        icon: <Send className="w-3 h-3 mr-1" />,
      };
    }

    if (s === "read") {
      return {
        className: "bg-indigo-50 dark:bg-transparent text-indigo-700 border-indigo-200",
        icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      };
    }

    if (s === "failed") {
      return {
        className: "bg-red-50 dark:bg-transparent text-red-700 border-red-200",
        icon: <XCircle className="w-3 h-3 mr-1" />,
      };
    }

    return {
      className: "bg-gray-50 dark:bg-transparent text-gray-600 border-gray-200",
      icon: <Clock className="w-3 h-3 mr-1" />,
    };
  }

  function exportToCSV() {
    toast.loading("Exporting message logs...", { id: "export-logs" });
    exportLogs(params);
  }

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: t("Timestamp"),
        cell: ({ row }) => {
          if (row.original.isSkeleton) {
            return <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />;
          }

          return (
            <div className="text-sm text-slate-600">
              {dayjs(row.original.createdAt).format("DD/MM/YYYY hh:mm A")}
            </div>
          );
        },
      },

      {
        accessorKey: "phone",
        header: t("Phone"),
        cell: ({ row }) => {
          if (row.original.isSkeleton) {
            return <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />;
          }

          return <div className="font-mono text-sm">{row.original.phone}</div>;
        },
      },

      {
        accessorKey: "status",
        header: t("Status"),
        cell: ({ row }) => {
          if (row.original.isSkeleton) {
            return <div className="h-5 w-20 bg-gray-200 animate-pulse rounded" />;
          }

          const status = row.original.status;
          const { className, icon } = getStatusBadge(status);

          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium capitalize ${className}`}
            >
              {icon}
              {status || "unknown"}
            </span>
          );
        },
      },

      {
        accessorKey: "sourceMessage",
        header: t("Source"),
        cell: ({ row }) => {
          if (row.original.isSkeleton) {
            return <div className="h-5 w-24 bg-gray-200 animate-pulse rounded" />;
          }

          const source = row.original.sourceMessage;
          const { className, icon } = getSourceBadge(source);

          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${className}`}
            >
              {icon}
              {formatLabel(source)}
            </span>
          );
        },
      },

      {
        accessorKey: "messageType",
        header: t("Type"),
        cell: ({ row }) => {
          if (row.original.isSkeleton) {
            return <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />;
          }

          return <div className="text-xs text-slate-500">{row.original.messageType}</div>;
        },
      },

      {
        accessorKey: "messagePreview",
        header: t("Template"),
        cell: ({ row }) => {
          if (row.original.isSkeleton) {
            return <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />;
          }

          return (
            <div className="max-w-75 truncate text-sm">{row.original.messagePreview || "-"}</div>
          );
        },
      },

      {
        accessorKey: "logs",
        header: t("Logs"),
        cell: ({ row }) => {
          const logsObj = row.original.logs;
          const status = row.original.status;
          if (status !== "failed") {
            return <span className="text-muted-foreground">-</span>;
          }
          if (!logsObj) {
            return <span className="text-muted-foreground">Failed</span>;
          }
          const shortMessage = logsObj?.error_data?.details || logsObj?.message || "View error";

          return (
            <Popover>
              <PopoverTrigger
                nativeButton={false}
                render={
                  <div className="max-w-64 truncate text-xs text-red-500 cursor-pointer hover:underline" />
                }
              >
                {shortMessage}
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[500px] border border-slate-200 bg-white text-black dark:bg-black dark:text-white shadow-lg"
              >
                <pre className="text-xs whitespace-pre-wrap break-words max-h-96 overflow-auto font-mono">
                  {JSON.stringify(logsObj, null, 2)}
                </pre>
              </PopoverContent>
            </Popover>
          );
        },
      },
    ],
    [],
  );

  const skeletonData = Array.from({ length: pagination.pageSize }).map((_, i) => ({
    id: i,
    isSkeleton: true,
  }));

  return (
    <div className="h-full relative">
      <div className="p-3 border shadow-xs rounded-xl mb-4 bg-white dark:bg-transparent">
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("Search phone or message")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-8"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearch("")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value ?? "all")}
            items={[
              { value: "all", label: t("All Status") },
              { value: "sent", label: t("Sent") },
              { value: "delivered", label: t("Delivered") },
              { value: "failed", label: t("Failed") },
              { value: "read", label: t("Read") },
            ]}
          >
            <SelectTrigger className="h-8 w-full max-w-44">
              <SelectValue placeholder={t("All Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Status")}</SelectItem>
              <SelectItem value="sent">{t("Sent")}</SelectItem>
              <SelectItem value="delivered">{t("Delivered")}</SelectItem>
              <SelectItem value="failed">{t("Failed")}</SelectItem>
              <SelectItem value="read">{t("Read")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedSource}
            onValueChange={(value) => setSelectedSource(value ?? "all")}
            items={[
              { value: "all", label: t("All Sources") },
              { value: "CAMPAIGN", label: t("Campaign") },
              { value: "TEMPLATE", label: t("Template") },
              { value: "external", label: t("External API") },
            ]}
          >
            <SelectTrigger className="h-8 w-full max-w-44">
              <SelectValue placeholder={t("All Sources")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Sources")}</SelectItem>
              <SelectItem value="CAMPAIGN">{t("Campaign")}</SelectItem>
              <SelectItem value="TEMPLATE">{t("Template")}</SelectItem>
              <SelectItem value="external">{t("External API")}</SelectItem>
            </SelectContent>
          </Select>

          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
            className="h-8 w-full max-w-44"
          />

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => exportToCSV()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? t("Exporting...") : t("Export")}
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={isLoading ? skeletonData : filteredData}
        serverSide={{
          pagination,
          onPaginationChange: handlePaginationChange,
          rowCount: messageLogsData?.pagination?.total || 0,
        }}
      />
    </div>
  );
}

export default MessageLogs;
