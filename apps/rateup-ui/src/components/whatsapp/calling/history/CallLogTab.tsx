import { IconMessage, IconPhoneIncoming, IconPhoneOutgoing, IconSearch } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  CallDirection,
  CallLogRow,
  CallOutcome,
  CallStatus,
} from "@/backend/whatsapp/calling/calling.api";
import { useCallLog } from "@/backend/whatsapp/calling/calling.query";
import { formatDuration } from "@/components/dashboard/analytics/kit/format.ts";
import { DotBadge } from "@/components/dashboard/analytics/kit/StatusBadges.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import type { CallsScope } from "./CallsPage.tsx";
import { FilterSelect } from "./FilterSelect.tsx";

const ALL = "all";

function OutcomeBadge({ status }: Readonly<{ status: CallStatus }>) {
  const { t } = useTranslation();
  switch (status) {
    case "COMPLETED":
    case "ACCEPTED":
      return <DotBadge dotClassName="bg-primary" label={t("Answered")} />;
    case "REJECTED":
      return <DotBadge dotClassName="bg-amber-500 dark:bg-amber-400" label={t("Declined")} />;
    case "FAILED":
      return <DotBadge dotClassName="bg-destructive" label={t("Failed")} />;
    case "RINGING":
      return <DotBadge dotClassName="bg-muted-foreground/50" label={t("Ringing")} />;
    default:
      return <DotBadge dotClassName="bg-destructive" label={t("Missed")} />;
  }
}

const isUnanswered = (row: CallLogRow) =>
  row.direction === "USER_INITIATED" &&
  (row.status === "MISSED" || row.status === "FAILED" || row.status === "REJECTED");

export default function CallLogTab({ scope }: Readonly<{ scope: CallsScope }>) {
  const { t } = useTranslation();
  const [direction, setDirection] = useState(ALL);
  const [outcome, setOutcome] = useState(ALL);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const query = useCallLog({
    ...scope,
    direction: direction === ALL ? undefined : (direction as CallDirection),
    outcome: outcome === ALL ? undefined : (outcome as CallOutcome),
    search: deferredSearch || undefined,
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const isStale = query.isPlaceholderData;

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative w-full sm:w-64">
          <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search name or number")}
            aria-label={t("Search name or number")}
            className="h-8 pl-8"
          />
        </div>
        <FilterSelect
          value={direction}
          onChange={setDirection}
          label={t("Direction")}
          options={[
            { value: ALL, label: t("All directions") },
            { value: "USER_INITIATED", label: t("Incoming") },
            { value: "BUSINESS_INITIATED", label: t("Outgoing") },
          ]}
        />
        <FilterSelect
          value={outcome}
          onChange={setOutcome}
          label={t("Outcome")}
          options={[
            { value: ALL, label: t("All outcomes") },
            { value: "answered", label: t("Answered") },
            { value: "missed", label: t("Missed") },
            { value: "declined", label: t("Declined") },
            { value: "failed", label: t("Failed") },
          ]}
        />
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyTitle>{t("Could not load calls")}</EmptyTitle>
            <EmptyDescription>{getApiErrorMessage(query.error, t("Try again"))}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {t("Retry")}
          </Button>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyTitle>{t("No calls")}</EmptyTitle>
            <EmptyDescription>
              {t("No calls match these filters. Try a longer date range.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={cn("transition-opacity", isStale && "opacity-60")} aria-busy={isStale}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("When")}</TableHead>
                <TableHead>{t("Customer")}</TableHead>
                <TableHead>{t("Outcome")}</TableHead>
                <TableHead className="text-right">{t("Duration")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Agent")}</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">{t("Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <CallRow key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
          {query.hasNextPage && (
            <div className="flex justify-center border-t border-border p-3">
              <Button
                variant="outline"
                size="sm"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                {t("Load more")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CallRow({ row }: Readonly<{ row: CallLogRow }>) {
  const { t } = useTranslation();
  const outbound = row.direction === "BUSINESS_INITIATED";
  const DirectionIcon = outbound ? IconPhoneOutgoing : IconPhoneIncoming;
  const unanswered = isUnanswered(row);
  const at = dayjs(row.createdAt);

  return (
    <TableRow className={cn(unanswered && "bg-destructive/5 dark:bg-destructive/10")}>
      <TableCell className="pl-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <DirectionIcon
            className={cn(
              "size-4 shrink-0",
              unanswered ? "text-destructive" : "text-muted-foreground",
            )}
            aria-label={outbound ? t("Outgoing") : t("Incoming")}
          />
          <div className="flex flex-col">
            <span className="text-sm text-foreground">{at.format("D MMM, h:mm A")}</span>
            <span className="text-xs text-muted-foreground">{at.fromNow()}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {row.contactName || `+${row.customerWaId}`}
          </span>
          {row.contactName && (
            <span className="text-xs text-muted-foreground">+{row.customerWaId}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <OutcomeBadge status={row.status} />
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-foreground">
        {row.durationSeconds ? formatDuration(row.durationSeconds) : "—"}
      </TableCell>
      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
        {row.agentName ?? "—"}
      </TableCell>
      <TableCell className="pr-4 text-right">
        {row.contactId && (
          <Button
            variant={unanswered ? "outline" : "ghost"}
            size="sm"
            render={
              <Link
                to="/dashboard/inbox"
                search={{ tab: "open", contactId: row.contactId, history: true, reveal: true }}
              />
            }
          >
            <IconMessage aria-hidden="true" />
            {/* A call back is placed from the chat, where the call-permission and
                24-hour rules already apply. */}
            {unanswered ? t("Call back") : t("Open chat")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
