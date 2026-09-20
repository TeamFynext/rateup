import { IconDownload, IconLoader2, IconSearch, IconX } from "@tabler/icons-react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { WaMessageLogRow } from "@/backend/whatsapp/inbox/message/wamessage.api.ts";
import {
  useExportWaMessageLogs,
  useWaMessageLogs,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { AnalyticsCard, AnalyticsEmpty } from "../kit/AnalyticsCard.tsx";
import type { AnalyticsFilters } from "../kit/filters.ts";
import { MessageSourceBadge, MessageStatusBadge } from "../kit/StatusBadges.tsx";

function FilterSelect({
  value,
  onChange,
  options,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}>) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "all")} items={options}>
      <SelectTrigger className="h-8 w-full sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Every outbound message in the range, one row each. Date and team come from the section's filter bar. */
export function MessageLogs({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(
    () => ({
      dateKey: filters.dateRange.key,
      dateRange: filters.dateRange.range,
      status,
      source,
      team: filters.teamId,
      searchQuery: debouncedSearch,
      pagination,
    }),
    [filters, status, source, debouncedSearch, pagination],
  );
  const query = useWaMessageLogs(params);
  const { mutate: exportLogs, isPending: isExporting } = useExportWaMessageLogs();
  const rows = query.data?.data ?? [];

  function changeFilter(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };
  }

  const columns = useMemo<ColumnDef<WaMessageLogRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: t("Time"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {dayjs(row.original.createdAt).format("D MMM YYYY, h:mm A")}
          </span>
        ),
      },
      {
        accessorKey: "phone",
        header: t("Phone"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.phone}</span>,
      },
      {
        accessorKey: "status",
        header: t("Status"),
        cell: ({ row }) => <MessageStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "sourceMessage",
        header: t("Source"),
        cell: ({ row }) => <MessageSourceBadge source={row.original.sourceMessage} />,
      },
      {
        accessorKey: "messageType",
        header: t("Type"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.messageType}</span>
        ),
      },
      {
        accessorKey: "messagePreview",
        header: t("Message"),
        cell: ({ row }) => (
          <span className="block max-w-72 truncate">{row.original.messagePreview || "—"}</span>
        ),
      },
      {
        accessorKey: "logs",
        header: t("Error"),
        cell: ({ row }) => {
          const logs = row.original.logs;
          if (row.original.status !== "failed") {
            return <span className="text-muted-foreground">—</span>;
          }
          if (!logs) return <span className="text-destructive">{t("Failed")}</span>;
          const summary = logs.error_data?.details || logs.message || t("View error");
          return (
            <Popover>
              <PopoverTrigger
                nativeButton={false}
                render={
                  <span className="block max-w-64 cursor-pointer truncate text-xs text-destructive hover:underline" />
                }
              >
                {String(summary)}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(500px,90vw)]">
                <pre className="max-h-96 overflow-auto font-mono text-xs break-words whitespace-pre-wrap">
                  {JSON.stringify(logs, null, 2)}
                </pre>
              </PopoverContent>
            </Popover>
          );
        },
      },
    ],
    [t],
  );

  return (
    <AnalyticsCard
      title={t("Message logs")}
      description={t(
        "Every WhatsApp message sent from Campaigns, the Inbox, templates and the API",
      )}
      query={query}
      skeleton={<Skeleton className="h-96 w-full" />}
      contentClassName="flex flex-col gap-3"
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={() => {
            toast.loading(t("Exporting message logs…"), { id: "export-logs" });
            exportLogs(params);
          }}
        >
          {isExporting ? <IconLoader2 className="animate-spin" /> : <IconDownload />}
          {t("Export Excel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <IconSearch className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("Search phone or message")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 ps-9 pe-8"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute end-1 top-1/2 size-6 -translate-y-1/2"
              onClick={() => setSearch("")}
              aria-label={t("Clear search")}
            >
              <IconX className="size-3.5" />
            </Button>
          )}
        </div>
        <FilterSelect
          value={status}
          onChange={changeFilter(setStatus)}
          options={[
            { value: "all", label: t("All statuses") },
            { value: "sent", label: t("Sent") },
            { value: "delivered", label: t("Delivered") },
            { value: "read", label: t("Read") },
            { value: "failed", label: t("Failed") },
          ]}
        />
        <FilterSelect
          value={source}
          onChange={changeFilter(setSource)}
          options={[
            { value: "all", label: t("All sources") },
            { value: "CAMPAIGN", label: t("Campaign") },
            { value: "TEMPLATE", label: t("Template") },
            { value: "external", label: t("External API") },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <AnalyticsEmpty
          title={t("No messages match")}
          description={t("Try a longer date range, another team, or clear the filters.")}
        />
      ) : (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={rows}
            serverSide={{
              pagination,
              onPaginationChange: setPagination,
              rowCount: query.data?.pagination?.total ?? 0,
            }}
          />
        </div>
      )}
    </AnalyticsCard>
  );
}
