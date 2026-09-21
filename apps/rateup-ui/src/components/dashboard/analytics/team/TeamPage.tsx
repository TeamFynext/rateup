import {
  IconChevronRight,
  IconClock,
  IconFileTypePdf,
  IconLoader2,
  IconMessageCircle,
  IconRefresh,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { endFreshAnalytics, requestFreshAnalytics } from "@/backend/analytics/analyticsFilter";
import { useGetTeamDetailedMetrics } from "@/backend/conversation/conversation.query";
import { teamKeys } from "@/backend/org/org.keys";
import { BackLink } from "@/components/common/back-link.tsx";
import { type StatChange, StatTile } from "@/components/common/StatTile.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { DateSelector } from "@/components/whatsapp/inbox/analytics/DateRangeSelector.tsx";
import { MessagePlatform } from "@/types/enums.ts";

import { AnalyticsCard } from "../kit/AnalyticsCard.tsx";
import { AnalyticsHeader, AnalyticsToolbar } from "../kit/AnalyticsHeader.tsx";
import { formatCount, formatDuration, formatPercent, toNumber } from "../kit/format.ts";
import { StaffStatusBadge } from "../kit/StatusBadges.tsx";
import { CLICKABLE_ROWS, NAME_LINK } from "../kit/tableStyles.ts";
import { TileGroup } from "../kit/TileGroup.tsx";
import { exportTeamReport } from "../report/exportReport.ts";

const ICON = "size-4 text-muted-foreground";

interface MemberRow {
  id: string;
  name: string;
  status: string | undefined;
  messages: number;
  responseSeconds: number | undefined;
  active: number;
}

/** One team's numbers: `/dashboard/analytics/team/$teamid`. */
export function TeamPage() {
  const { t } = useTranslation();
  const [day, setDay] = useState(7);
  const queryClient = useQueryClient();
  const { teamid } = useParams({ strict: false });
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const query = useGetTeamDetailedMetrics(teamid ?? "", { days: day });
  const data = query.data;

  function refresh() {
    requestFreshAnalytics();
    queryClient
      .invalidateQueries({
        queryKey: teamKeys.detailedMetrics(teamid, { days: day }),
        refetchType: "all",
      })
      .finally(endFreshAnalytics);
  }

  async function exportPdf() {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportTeamReport(queryClient, data, day);
    } catch (error) {
      console.error(error);
      toast.error(t("The report could not be created. Try again in a moment."));
    } finally {
      setIsExporting(false);
    }
  }

  // Week-on-week, whatever range is picked. Response time comes back as an
  // improvement (positive = faster); the tile shows the change in the time itself.
  const vsLastWeek = t("vs last week");
  const responseImprovement = toNumber(data?.averageResponseTimeComparedToLastWeek);
  const resolutionChange = toNumber(data?.resolutionRateComparedToLastWeek);
  const responseChange: StatChange | undefined =
    responseImprovement === null
      ? undefined
      : { value: -responseImprovement, goodWhen: "down", label: vsLastWeek };

  const rows = useMemo<MemberRow[]>(
    () =>
      (data?.members ?? []).map((member) => ({
        id: member.userId,
        name: member.name,
        status: member.onlineStatus,
        messages: toNumber(member.messagesHandled) ?? 0,
        responseSeconds: toNumber(member.averageResponseTime) ?? undefined,
        active: toNumber(member.staffActiveChats) ?? 0,
      })),
    [data],
  );

  const columns = useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: createSortableHeader(t("Agent")),
        cell: ({ row }) => (
          <div className="flex min-w-44 items-center gap-3">
            <CreativeAvatar name={row.original.name} platform={MessagePlatform.WEBCHAT} size="sm" />
            <Link
              to="/dashboard/analytics/$staffid"
              params={{ staffid: row.original.id }}
              onClick={(event) => event.stopPropagation()}
              className={NAME_LINK}
            >
              {row.original.name}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("Status"),
        cell: ({ row }) => <StaffStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "messages",
        header: createSortableHeader(t("Messages")),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCount(row.original.messages)}</span>
        ),
      },
      {
        accessorKey: "responseSeconds",
        header: createSortableHeader(t("Avg first response")),
        sortUndefined: "last",
        cell: ({ row }) =>
          formatDuration(row.original.responseSeconds) ?? (
            <span className="text-muted-foreground">{t("No replies yet")}</span>
          ),
      },
      {
        accessorKey: "active",
        header: createSortableHeader(t("Active chats")),
        cell: ({ row }) => <span className="tabular-nums">{formatCount(row.original.active)}</span>,
      },
      {
        id: "open",
        header: "",
        cell: () => <IconChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />,
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-3">
      {query.isPending ? (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
      ) : (
        <AnalyticsHeader
          back={
            <BackLink
              to="/dashboard/analytics"
              search={{ tab: "conversations", view: "teams" }}
              label={t("Teams")}
              iconOnly
            />
          }
          leading={
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary"
              // Some teams were saved with the string "null" as their colour.
              style={
                data?.teamColor && data.teamColor !== "null"
                  ? { backgroundColor: data.teamColor }
                  : undefined
              }
            >
              <IconUsers className="size-5 text-white" />
            </div>
          }
          title={data?.teamName}
          description={t("{members} members · {online} online", {
            members: data?.teamMembers ?? 0,
            online: data?.teamMembersOnline ?? 0,
          })}
        />
      )}
      <AnalyticsToolbar>
        <DateSelector days={day} setDays={setDay} />
        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" onClick={refresh} disabled={query.isFetching}>
            <IconRefresh className={query.isFetching ? "animate-spin" : undefined} />
            {t("Refresh")}
          </Button>
          <Button variant="outline" onClick={exportPdf} disabled={!data || isExporting}>
            {isExporting ? <IconLoader2 className="animate-spin" /> : <IconFileTypePdf />}
            {isExporting ? t("Preparing report…") : t("PDF report")}
          </Button>
        </div>
      </AnalyticsToolbar>

      <div className="flex flex-col gap-6 pt-1">
        <TileGroup query={query} count={4}>
          <StatTile
            label={t("Members")}
            value={formatCount(data?.teamMembers)}
            note={t("{count} online", { count: formatCount(data?.teamMembersOnline) })}
            icon={<IconUsers className={ICON} />}
          />
          <StatTile
            label={t("Active chats")}
            value={formatCount(data?.activeChats)}
            note={t("Being handled now")}
            icon={<IconMessageCircle className={ICON} />}
          />
          <StatTile
            label={t("Avg first response")}
            value={formatDuration(data?.averageResponseTime)}
            emptyValue={t("No replies yet")}
            icon={<IconClock className={ICON} />}
            change={responseChange}
          />
          <StatTile
            label={t("Resolution rate")}
            value={formatPercent(data?.resolutionRate) ?? "0%"}
            icon={<IconTarget className={ICON} />}
            change={
              resolutionChange === null
                ? undefined
                : { value: resolutionChange, goodWhen: "up", label: vsLastWeek, unit: " pts" }
            }
          />
        </TileGroup>

        <AnalyticsCard
          title={t("Members")}
          description={t("What each member of this team handled in this range")}
          query={query}
          isEmpty={rows.length === 0}
          emptyTitle={t("No members yet")}
          emptyDescription={t("Add people to this team in Settings to see them here.")}
          skeleton={<Skeleton className="h-72 w-full" />}
        >
          <div className={CLICKABLE_ROWS}>
            <DataTable
              columns={columns}
              data={rows}
              onRowClick={(row) =>
                navigate({ to: "/dashboard/analytics/$staffid", params: { staffid: row.id } })
              }
            />
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
