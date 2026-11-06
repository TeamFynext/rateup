import { Avatar, AvatarFallback } from "@rateup/ui/components/avatar";
import { Button } from "@rateup/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@rateup/ui/components/empty";
import { Input } from "@rateup/ui/components/input";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { getInitials } from "@rateup/ui/lib/initials";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconMessage,
  IconPhoneOutgoing,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { type ReactNode, useDeferredValue, useState } from "react";
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
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { formatCallDuration } from "@/utils/whatsapp/callFormat.ts";

import type { CallsScope } from "./CallsPage.tsx";
import { FilterSelect } from "./FilterSelect.tsx";
import { useNow } from "./useNow.ts";

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
          <ul className="flex flex-col gap-2 p-3">
            {rows.map((row) => (
              <CallRow key={row.id} row={row} />
            ))}
          </ul>
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

/** Who was on one end of the call: an avatar, a name, and a line under it. */
function Party({
  name,
  title,
  detail,
}: Readonly<{ name: string | null; title: string; detail?: ReactNode }>) {
  const initials = getInitials(name);
  return (
    <div className="flex min-w-0 flex-1 basis-44 items-center gap-2.5">
      <Avatar>
        <AvatarFallback className="text-xs font-medium">
          {initials || <IconUser className="size-4" aria-hidden="true" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col items-start gap-0.5">
        <span
          className={cn(
            "max-w-full truncate text-sm font-semibold",
            name === null ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {title}
        </span>
        {detail}
      </div>
    </div>
  );
}

function DirectionChip({
  outbound,
  unanswered,
}: Readonly<{ outbound: boolean; unanswered: boolean }>) {
  const { t } = useTranslation();
  const Icon = outbound ? IconArrowUpRight : IconArrowDownLeft;
  const label = outbound ? t("Outgoing") : t("Incoming");
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        unanswered
          ? "bg-destructive/10 text-destructive"
          : outbound
            ? "bg-green-600/10 text-green-700 dark:text-green-500"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function CallRow({ row }: Readonly<{ row: CallLogRow }>) {
  const { t } = useTranslation();
  const outbound = row.direction === "BUSINESS_INITIATED";
  const unanswered = isUnanswered(row);
  const live = row.status === "RINGING" || row.status === "ACCEPTED";
  const now = useNow(live);
  const at = dayjs(row.createdAt);
  const phone = `+${row.customerWaId}`;

  // A call still on the line counts up: talk time once answered, ring time before that.
  const liveSince = new Date(
    row.status === "ACCEPTED" ? (row.answeredAt ?? row.createdAt) : row.createdAt,
  ).getTime();
  const duration = live
    ? formatCallDuration((now - liveSince) / 1000)
    : row.durationSeconds
      ? formatDuration(row.durationSeconds)
      : "—";
  // A call back is placed from the chat, where the call-permission and 24-hour rules
  // already apply.
  const actionLabel = unanswered ? t("Call back") : t("Open chat");
  const ActionIcon = unanswered ? IconPhoneOutgoing : IconMessage;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted/50 px-3 py-2.5",
        unanswered && "bg-destructive/5 dark:bg-destructive/10",
      )}
    >
      <div className="flex w-20 shrink-0 flex-col">
        <span className="flex items-center gap-1.5 text-sm tabular-nums text-foreground">
          {at.format("h:mm A")}
          {live && (
            <span
              role="img"
              aria-label={t("In progress")}
              className="size-1.5 animate-pulse rounded-full bg-green-600 dark:bg-green-500"
            />
          )}
        </span>
        <span className="text-xs text-muted-foreground">{at.format("D MMM")}</span>
      </div>

      <Party
        name={row.agentName}
        title={row.agentName ?? t("No agent")}
        detail={<OutcomeBadge status={row.status} />}
      />
      <Party
        name={row.contactName}
        title={row.contactName || phone}
        detail={
          row.contactName && (
            <span className="text-xs tabular-nums text-muted-foreground">{phone}</span>
          )
        }
      />

      <DirectionChip outbound={outbound} unanswered={unanswered} />

      <div className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-background py-1 pr-1 pl-3">
        <span
          className={cn(
            "min-w-12 text-sm tabular-nums",
            live ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {duration}
        </span>
        {row.contactId && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={actionLabel}
            title={actionLabel}
            render={
              <Link
                to="/dashboard/inbox"
                search={{ tab: "open", contactId: row.contactId, history: true, reveal: true }}
              />
            }
          >
            <ActionIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </li>
  );
}
