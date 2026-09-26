import { IconChevronRight, IconSearch, IconUser, IconUsersGroup } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef, ReactTable, RowData } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useGetConversationAccountDistribution,
  useGetStaffPerformanceonConversation,
  useGetTeamOverview,
} from "@/backend/conversation/conversation.query";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils";
import { MessagePlatform } from "@/types/enums.ts";

import type { ConversationsView as SubView } from "../analyticsView.ts";
import { AnalyticsCard } from "../kit/AnalyticsCard.tsx";
import { BarList } from "../kit/BarList.tsx";
import { type AnalyticsFilters, conversationFilter } from "../kit/filters.ts";
import { formatCount, formatDuration, toNumber } from "../kit/format.ts";
import { StaffAvatar } from "../kit/StaffAvatar.tsx";
import { StaffStatusBadge } from "../kit/StatusBadges.tsx";
import { CLICKABLE_ROWS, NAME_LINK } from "../kit/tableStyles.ts";
import { ResponseTimeCard } from "../sections/ResponseTimeCard.tsx";

interface AgentRow {
  id: string;
  name: string;
  email: string;
  status: string;
  photo: string | null;
  messages: number;
  messagesChange: number | null;
  responseSeconds: number | undefined;
  responseChange: number | null;
  active: number;
  resolved: number;
}

interface TeamRow {
  id: string;
  name: string;
  color: string | null;
  members: number;
  online: number;
  messages: number;
  active: number;
  responseSeconds: number | undefined;
}

/** A week-on-week change under a table value. `better` says whether the move is good news. */
function WeekChange({ text, better }: Readonly<{ text: string; better: boolean }>) {
  return (
    <span
      className={cn("text-xs", better ? "text-green-700 dark:text-green-500" : "text-destructive")}
    >
      {text}
    </span>
  );
}

function SearchToolbar<TData extends RowData>({
  table,
}: Readonly<{ table: ReactTable<DataTableFeatures, TData> }>) {
  const { t } = useTranslation();
  return (
    <div className="relative mb-3 max-w-xs">
      <IconSearch className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={t("Search by name")}
        value={String(table.state.globalFilter ?? "")}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        className="h-8 ps-9"
      />
    </div>
  );
}

const chevron = <IconChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />;

function AgentsTable({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useGetStaffPerformanceonConversation(conversationFilter(filters));

  // Flat rows: the table's search matches on each value, and a nested object would
  // only ever match as "[object Object]".
  const rows = useMemo<AgentRow[]>(
    () =>
      (query.data ?? []).map((agent) => ({
        id: agent.staff.userId,
        name: agent.staff.name,
        email: agent.staff.email,
        status: agent.staff.status,
        photo: agent.staff.profilePhoto ?? null,
        messages: toNumber(agent.totalMessagesHandled) ?? 0,
        messagesChange: toNumber(agent.messagesHandledRateByLastWeek),
        responseSeconds: toNumber(agent.averageResponseTime) ?? undefined,
        responseChange: toNumber(agent.responseTimeRateByLastWeek),
        active: toNumber(agent.totalAssignedConversations) ?? 0,
        resolved: toNumber(agent.totalClosedConversations) ?? 0,
      })),
    [query.data],
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, AgentRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: createSortableHeader(t("Agent")),
        cell: ({ row }) => (
          <div className="flex min-w-48 items-center gap-3">
            <StaffAvatar name={row.original.name} photo={row.original.photo} />
            <div className="flex min-w-0 flex-col">
              <Link
                to="/dashboard/analytics/$staffid"
                params={{ staffid: row.original.id }}
                onClick={(event) => event.stopPropagation()}
                className={NAME_LINK}
              >
                {row.original.name}
              </Link>
              <span className="truncate text-xs text-muted-foreground">{row.original.email}</span>
            </div>
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
        cell: ({ row }) => {
          const change = row.original.messagesChange;
          return (
            <div className="flex flex-col tabular-nums">
              {formatCount(row.original.messages)}
              {change !== null && change !== 0 && (
                <WeekChange
                  better={change > 0}
                  text={t("{value}% vs last week", {
                    value: `${change > 0 ? "+" : ""}${Math.round(change)}`,
                  })}
                />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "responseSeconds",
        header: createSortableHeader(t("Avg first response")),
        sortUndefined: "last",
        cell: ({ row }) => {
          const change = row.original.responseChange;
          const value = formatDuration(row.original.responseSeconds);
          if (value === null) {
            return <span className="text-muted-foreground">{t("No replies yet")}</span>;
          }
          // The API reports this as an improvement: positive means faster than last week.
          return (
            <div className="flex flex-col tabular-nums">
              {value}
              {change !== null && Math.round(change) !== 0 && (
                <WeekChange
                  better={change > 0}
                  text={
                    change > 0
                      ? t("{value}% faster than last week", { value: Math.round(change) })
                      : t("{value}% slower than last week", { value: Math.round(-change) })
                  }
                />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "active",
        header: createSortableHeader(t("Active")),
        cell: ({ row }) => <span className="tabular-nums">{formatCount(row.original.active)}</span>,
      },
      {
        accessorKey: "resolved",
        header: createSortableHeader(t("Resolved")),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCount(row.original.resolved)}</span>
        ),
      },
      { id: "open", header: "", cell: () => chevron },
    ],
    [t],
  );

  return (
    <AnalyticsCard
      title={t("Agents")}
      description={t("What each agent handled in this range")}
      query={query}
      isEmpty={rows.length === 0}
      emptyTitle={t("No agents to show")}
      emptyDescription={t("This team has no active members.")}
      skeleton={<Skeleton className="h-96 w-full" />}
    >
      <div className={CLICKABLE_ROWS}>
        <DataTable
          columns={columns}
          data={rows}
          DataTableToolbar={SearchToolbar}
          onRowClick={(row) =>
            navigate({ to: "/dashboard/analytics/$staffid", params: { staffid: row.id } })
          }
        />
      </div>
    </AnalyticsCard>
  );
}

function TeamsTable({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useGetTeamOverview(conversationFilter(filters));

  const rows = useMemo<TeamRow[]>(
    () =>
      (query.data ?? []).map((team) => ({
        id: team.teamId,
        name: team.teamName,
        // Some teams were saved with the string "null" as their colour.
        color: team.teamColor && team.teamColor !== "null" ? team.teamColor : null,
        members: toNumber(team.teamMembers) ?? 0,
        online: toNumber(team.teamMembersOnline) ?? 0,
        messages: toNumber(team.messagesSent) ?? 0,
        active: toNumber(team.assignedConversations) ?? 0,
        responseSeconds: toNumber(team.averageResponseTime) ?? undefined,
      })),
    [query.data],
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, TeamRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: createSortableHeader(t("Team")),
        cell: ({ row }) => (
          <div className="flex min-w-40 items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full bg-primary"
              style={row.original.color ? { backgroundColor: row.original.color } : undefined}
              aria-hidden
            />
            <Link
              to="/dashboard/analytics/team/$teamid"
              params={{ teamid: row.original.id }}
              onClick={(event) => event.stopPropagation()}
              className={NAME_LINK}
            >
              {row.original.name}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "members",
        header: createSortableHeader(t("Members")),
        cell: ({ row }) => (
          <div className="flex flex-col tabular-nums">
            {formatCount(row.original.members)}
            <span className="text-xs text-muted-foreground">
              {t("{count} online", { count: row.original.online })}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "messages",
        header: createSortableHeader(t("Messages sent")),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCount(row.original.messages)}</span>
        ),
      },
      {
        accessorKey: "active",
        header: createSortableHeader(t("Active conversations")),
        cell: ({ row }) => <span className="tabular-nums">{formatCount(row.original.active)}</span>,
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
      { id: "open", header: "", cell: () => chevron },
    ],
    [t],
  );

  return (
    <AnalyticsCard
      title={t("Teams")}
      description={t("Conversations assigned to each team in this range")}
      query={query}
      isEmpty={rows.length === 0}
      emptyTitle={t("No teams yet")}
      emptyDescription={t("Create a team in Settings to see its numbers here.")}
      skeleton={<Skeleton className="h-72 w-full" />}
    >
      <div className={CLICKABLE_ROWS}>
        <DataTable
          columns={columns}
          data={rows}
          DataTableToolbar={SearchToolbar}
          onRowClick={(row) =>
            navigate({ to: "/dashboard/analytics/team/$teamid", params: { teamid: row.id } })
          }
        />
      </div>
    </AnalyticsCard>
  );
}

function ChannelDistributionCard({ filters }: Readonly<{ filters: AnalyticsFilters }>) {
  const { t } = useTranslation();
  const query = useGetConversationAccountDistribution(conversationFilter(filters));
  const platformLabel: Record<string, string> = {
    [MessagePlatform.WHATSAPP]: "WhatsApp",
    [MessagePlatform.INSTAGRAM]: "Instagram",
    [MessagePlatform.WEBCHAT]: t("Web chat"),
    [MessagePlatform.FACEBOOK]: "Facebook",
  };
  const channels = [...(query.data ?? [])].sort(
    (a, b) => (toNumber(b.conversationCount) ?? 0) - (toNumber(a.conversationCount) ?? 0),
  );
  const total = channels.reduce(
    (sum, channel) => sum + (toNumber(channel.conversationCount) ?? 0),
    0,
  );

  return (
    <AnalyticsCard
      title={t("Channels")}
      description={t("Conversations started on each connected number or account")}
      query={query}
      isEmpty={total === 0}
      emptyTitle={t("No conversations in this range")}
    >
      <BarList
        items={channels.map((channel, index) => {
          const count = toNumber(channel.conversationCount) ?? 0;
          const platform = platformLabel[channel.sourcePlatform] ?? channel.sourcePlatform;
          return {
            key: `${channel.phoneId ?? channel.ibaId ?? channel.sourcePlatform}-${index}`,
            label: channel.phone || channel.ibaId || platform,
            secondary: channel.phone || channel.ibaId ? platform : undefined,
            value: count,
            display: total
              ? `${formatCount(count)} · ${Math.round((count / total) * 100)}%`
              : formatCount(count),
          };
        })}
      />
    </AnalyticsCard>
  );
}

export function ConversationsView({
  filters,
  view,
  onViewChange,
}: Readonly<{
  filters: AnalyticsFilters;
  view: SubView;
  onViewChange: (view: SubView) => void;
}>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === "agents" || value === "teams") onViewChange(value);
        }}
      >
        <TabsList>
          <TabsTrigger value="agents">
            <IconUser />
            {t("Agents")}
          </TabsTrigger>
          <TabsTrigger value="teams">
            <IconUsersGroup />
            {t("Teams")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {view === "agents" ? <AgentsTable filters={filters} /> : <TeamsTable filters={filters} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <ResponseTimeCard filters={filters} />
        <ChannelDistributionCard filters={filters} />
      </div>
    </div>
  );
}
