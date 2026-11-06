import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { ApiKey } from "@/backend/apiKeys/apiKeys.api.ts";
import { useApiRequests, useApiUsage } from "@/backend/apiKeys/apiKeys.query.ts";
import { requestOutcomeConfig } from "@/components/common/chartTheme.ts";
import { DotBadge } from "@/components/dashboard/analytics/kit/StatusBadges.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { formatToRelativeTime } from "@/utils/dateTime.ts";
import { toText } from "@/utils/toText";

import { lastUtcDays } from "./apiKeyFormat.ts";

const DAYS = 14;
const ALL = "all";
const PAGE_SIZE = 25;

/** Recharts types the tooltip label as a ReactNode; ours is always the `day` value. */
const formatDay = (day: string) => dayjs(day).format("D MMM");
const tooltipLabel = (label: unknown) =>
  typeof label === "string" ? formatDay(label) : toText(label);

/**
 * Calls made with the org's keys over the last two weeks: a stacked bar per day split by
 * outcome, and the latest requests underneath as the table view of the same data.
 */
export function ApiUsagePanel({ keys }: Readonly<{ keys: readonly ApiKey[] }>) {
  const { t } = useTranslation();
  const [keyId, setKeyId] = useState<string>(ALL);
  const filterKeyId = keyId === ALL ? undefined : keyId;
  const usage = useApiUsage({ days: DAYS, keyId: filterKeyId });

  // The log pages by cursor, so "previous" is the cursor that opened the page before: a stack
  // of them, empty on the first page. A new key filter starts again from the newest request.
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const requests = useApiRequests({ keyId: filterKeyId, cursor, limit: PAGE_SIZE });
  const recent = requests.data?.data ?? [];
  const nextCursor = requests.data?.nextCursor ?? null;
  const pageNumber = cursors.length + 1;
  const changeKey = (value: string) => {
    setKeyId(value);
    setCursors([]);
  };

  const keyNames = useMemo(() => new Map(keys.map((key) => [key.id, key.name])), [keys]);
  const keyItems = useMemo(
    () => [
      { value: ALL, label: t("All keys") },
      ...keys.map((key) => ({ value: key.id, label: key.name })),
    ],
    [keys, t],
  );

  // One row per day, zero-filled, with every key's counts summed — the API groups by key too.
  const chartData = useMemo(() => {
    const byDay = new Map(
      lastUtcDays(DAYS).map((day) => [day, { day, ok: 0, clientErrors: 0, serverErrors: 0 }]),
    );
    for (const row of usage.data?.daily ?? []) {
      const entry = byDay.get(row.day);
      if (!entry) continue;
      entry.ok += row.ok;
      entry.clientErrors += row.clientErrors;
      entry.serverErrors += row.serverErrors;
    }
    return [...byDay.values()];
  }, [usage.data]);

  const total = chartData.reduce((sum, d) => sum + d.ok + d.clientErrors + d.serverErrors, 0);
  const config = requestOutcomeConfig({
    ok: t("Successful"),
    clientErrors: t("Client errors (4xx)"),
    serverErrors: t("Server errors (5xx)"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Usage")}</CardTitle>
        <CardDescription>
          {t("Requests made with your API keys over the last {days} days.", { days: DAYS })}
        </CardDescription>
        {keys.length > 1 && (
          <CardAction>
            <Select
              value={keyId}
              onValueChange={(value) => changeKey(value ?? ALL)}
              items={keyItems}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label={t("Filter by key")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keyItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {usage.isPending ? (
          <Skeleton className="h-60 w-full" />
        ) : usage.isError ? (
          <p className="text-sm text-muted-foreground">{t("Could not load API usage.")}</p>
        ) : total === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("No requests yet")}</EmptyTitle>
              <EmptyDescription>
                {t("Calls made with your keys will show up here within a few seconds.")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ChartContainer config={config} className="h-60 w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={formatDay}
                />
                <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipLabel} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="ok" stackId="requests" fill="var(--color-ok)" maxBarSize={48} />
                <Bar
                  dataKey="clientErrors"
                  stackId="requests"
                  fill="var(--color-clientErrors)"
                  maxBarSize={48}
                />
                <Bar
                  dataKey="serverErrors"
                  stackId="requests"
                  fill="var(--color-serverErrors)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ChartContainer>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t("Recent requests")}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Method")}</TableHead>
                    <TableHead>{t("Route")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="text-right">{t("Latency")}</TableHead>
                    {keyId === ALL && keys.length > 1 && <TableHead>{t("Key")}</TableHead>}
                    <TableHead>{t("Time")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.method}</TableCell>
                      <TableCell
                        className="max-w-72 truncate font-mono text-xs"
                        title={request.route}
                      >
                        {request.route}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {t("{ms} ms", { ms: request.latencyMs })}
                      </TableCell>
                      {keyId === ALL && keys.length > 1 && (
                        <TableCell className="max-w-40 truncate text-muted-foreground">
                          {(request.keyId && keyNames.get(request.keyId)) || t("Revoked key")}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        <time
                          dateTime={request.createdAt}
                          title={dayjs(request.createdAt).format("D MMM YYYY, h:mm:ss A")}
                        >
                          {formatToRelativeTime(request.createdAt)}
                        </time>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(cursors.length > 0 || nextCursor) && (
                <nav
                  aria-label={t("Recent requests pages")}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-xs text-muted-foreground">
                    {t("Page {page}", { page: pageNumber })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cursors.length === 0 || requests.isFetching}
                      onClick={() => setCursors((stack) => stack.slice(0, -1))}
                    >
                      {t("Previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!nextCursor}
                      loading={requests.isFetching && requests.isPlaceholderData}
                      onClick={() => nextCursor && setCursors((stack) => [...stack, nextCursor])}
                    >
                      {t("Next")}
                    </Button>
                  </div>
                </nav>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** The dot takes the same colour as the status class's segment in the chart above. */
function StatusBadge({ status }: Readonly<{ status: number }>) {
  const dot = status >= 500 ? "bg-destructive" : status >= 400 ? "bg-chart-5" : "bg-chart-2";
  return <DotBadge dotClassName={dot} label={String(status)} />;
}
