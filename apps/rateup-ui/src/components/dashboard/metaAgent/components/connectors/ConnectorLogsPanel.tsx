import { IconAlertTriangle, IconChartBar, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";

import { useConnectorLogs } from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Meta keeps 7 days and rejects anything wider, so those are the only windows
// worth offering.
const WINDOWS = [
  { value: "86400", label: "Last 24 hours" },
  { value: "259200", label: "Last 3 days" },
  { value: "604800", label: "Last 7 days" },
] as const;

export function ConnectorLogsPanel({
  waSettingsId,
  connectorId,
  active,
}: Readonly<{ waSettingsId: string; connectorId: string; active: boolean }>) {
  const [windowSeconds, setWindowSeconds] = useState("86400");
  const [summaryOnly, setSummaryOnly] = useState(false);
  // Pinned when the panel opens so a re-render does not shift the range and
  // silently refetch.
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  const query = {
    start_time: now - Number(windowSeconds),
    end_time: now,
    limit: 100,
    include_stats: true,
    summary_only: summaryOnly,
  };

  const { data, isLoading, isFetching, refetch } = useConnectorLogs(
    waSettingsId,
    connectorId,
    query,
    active,
  );

  const stats = data?.stats;
  const entries = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={windowSeconds}
            onValueChange={(value) => setWindowSeconds(value ?? "86400")}
            items={WINDOWS}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOWS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={summaryOnly} onCheckedChange={setSummaryOnly} />
            Group by failure pattern
          </label>
        </div>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
          <IconRefresh data-icon="inline-start" className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Calls" value={stats.start_count.toLocaleString()} />
          <Stat
            label="Success rate"
            value={`${Math.round(stats.success_rate * 100)}%`}
            tone={stats.success_rate < 0.9 ? "warn" : "ok"}
          />
          <Stat label="Failures" value={stats.exception_count.toLocaleString()} />
          <Stat label="p95 latency" value={`${stats.p95_latency_s.toFixed(2)}s`} />
        </div>
      )}

      {!isLoading && !entries.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No errors in this window</EmptyTitle>
          <EmptyDescription>
            Meta only logs failed calls, so an empty list is the good outcome.
          </EmptyDescription>
        </Empty>
      )}

      {!!entries.length && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{summaryOnly ? "Last seen" : "When"}</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Failure</TableHead>
                <TableHead>Message</TableHead>
                {summaryOnly && <TableHead className="text-right">Count</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => {
                const when = summaryOnly ? entry.last_seen : entry.event_time;
                return (
                  <TableRow key={`${entry.tool_name}-${entry.failure_code_name}-${index}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {when ? new Date(when).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.tool_name ?? "—"}</TableCell>
                    <TableCell>
                      {entry.failure_code_name ? (
                        <Badge variant="destructive" className="whitespace-nowrap">
                          <IconAlertTriangle data-icon="inline-start" />
                          {entry.failure_code_name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">
                      {entry.error_message ?? "—"}
                    </TableCell>
                    {summaryOnly && (
                      <TableCell className="text-right tabular-nums">
                        {entry.occurrences ?? 1}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ok",
}: Readonly<{ label: string; value: string; tone?: "ok" | "warn" }>) {
  return (
    <div className="rounded-lg border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconChartBar className="size-3.5" />
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "warn" && "text-amber-700 dark:text-amber-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}
