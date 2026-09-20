import dayjs from "dayjs";

import type {
  DeliveryOverview,
  DeliveryTrend,
  TeamApiOverviewRow,
  TemplateOverview,
} from "@/backend/apiAnalytics/apianalytics.api";
import type {
  ConversationAccountDistribution,
  StaffDetailedConversationAnalytics,
  TeamDetailedMetrics,
  ConversationOverviewStats,
  ConversationQuickStats,
  ConversationResolvedResponse,
  ConversationResponseStats,
  StaffPerformanceonConversation,
  TeamOverviewRow,
} from "@/backend/conversation/conversation.api";

import {
  formatBucket,
  formatCount,
  formatDuration,
  formatPercent,
  type Numeric,
  percentChange,
  toNumber,
} from "../kit/format.ts";
import type { ReportBlock, ReportStat, Tone, Translate } from "./reportModel.ts";

/** Everything a report can draw on. Each view fetches only the parts it uses. */
export interface ReportData {
  overview?: ConversationOverviewStats;
  previousOverview?: ConversationOverviewStats;
  quickStats?: ConversationQuickStats;
  resolved?: ConversationResolvedResponse[];
  responseTimes?: ConversationResponseStats[];
  staff?: StaffPerformanceonConversation[];
  teams?: TeamOverviewRow[];
  channels?: ConversationAccountDistribution[];
  delivery?: DeliveryOverview;
  deliveryTrend?: DeliveryTrend;
  templates?: TemplateOverview;
  teamDelivery?: TeamApiOverviewRow[];
}

/** Same threshold as the Messages view's "Failing" badge. */
const FAILING_RATE = 20;

const NO_REPLIES = "No replies yet";

/** Enum values from the API, as a reader would write them. */
const LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  WEBCHAT: "Web chat",
  FACEBOOK: "Facebook",
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
};

const label = (t: Translate, value: string) => {
  const known = LABELS[value.toUpperCase()];
  return known ? t(known) : value;
};

/** A duration stat, or a muted sentence when there is no duration to show. */
function durationValue(
  t: Translate,
  seconds: Numeric,
  missing = NO_REPLIES,
): Pick<ReportStat, "value" | "placeholder"> {
  const value = formatDuration(seconds);
  return value === null ? { value: t(missing), placeholder: true } : { value };
}

function change(
  t: Translate,
  value: number | null,
  goodWhen: "up" | "down",
  unit = "%",
  against: "previous period" | "last week" = "previous period",
): ReportStat["change"] {
  if (value === null) return undefined;
  const rounded = Number(value.toFixed(1));
  const tone: Tone =
    rounded === 0 ? "neutral" : rounded > 0 === (goodWhen === "up") ? "good" : "bad";
  const text = `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
  return {
    text:
      against === "last week"
        ? t("{value} vs last week", { value: text })
        : t("{value} vs previous period", { value: text }),
    tone,
  };
}

export function conversationStats(t: Translate, data: ReportData): ReportStat[] {
  const now = data.overview;
  const before = data.previousOverview;
  const resolutionNow = toNumber(now?.resolutionRate);
  const resolutionBefore = toNumber(before?.resolutionRate);
  return [
    {
      label: t("Conversations"),
      value: formatCount(now?.totalConversations),
      change: change(t, percentChange(now?.totalConversations, before?.totalConversations), "up"),
    },
    {
      label: t("First response"),
      ...durationValue(t, now?.averageResponseTime),
      note: t("Any reply, including automations"),
      change: change(
        t,
        percentChange(now?.averageResponseTime, before?.averageResponseTime),
        "down",
      ),
    },
    {
      label: t("Agent response"),
      ...durationValue(t, now?.averageResponseTimeByAgent),
      note: t("First reply from a person"),
      change: change(
        t,
        percentChange(now?.averageResponseTimeByAgent, before?.averageResponseTimeByAgent),
        "down",
      ),
    },
    {
      label: t("Resolution rate"),
      value: formatPercent(now?.resolutionRate) ?? "0%",
      change:
        resolutionNow === null || resolutionBefore === null
          ? undefined
          : change(t, resolutionNow - resolutionBefore, "up", " pts"),
    },
  ];
}

export function deliveryStats(t: Translate, data: ReportData): ReportStat[] {
  const d = data.delivery;
  const avg = toNumber(d?.avgDeliveryTimeSeconds);
  return [
    {
      label: t("Messages sent"),
      value: formatCount(d?.totalMessages),
      change: change(t, toNumber(d?.totalMessagesChange), "up"),
    },
    {
      label: t("Delivered"),
      value: formatPercent(d?.deliveredPercentage) ?? "0%",
      note: t("{count} messages", { count: formatCount(d?.deliveredMessages) }),
    },
    {
      label: t("Failed"),
      value: formatCount(d?.failedMessages),
      note: t("{percent} of sent", { percent: formatPercent(d?.failedPercentage) ?? "0%" }),
    },
    {
      label: t("Avg delivery time"),
      ...(avg !== null && avg < 1 ? { value: "<1s" } : durationValue(t, avg, "Nothing delivered")),
      change: change(t, toNumber(d?.avgDeliveryTimeChange), "down"),
    },
  ];
}

function liveStats(t: Translate, data: ReportData, teamId: string): ReportBlock[] {
  const q = data.quickStats;
  if (!q) return [];
  return [
    {
      kind: "section",
      title: t("Right now"),
      note: t("Counts when the report was generated; not affected by the date range"),
    },
    {
      kind: "stats",
      items: [
        {
          label: t("Unassigned"),
          value: formatCount(q.newConversations),
          note: teamId !== "all" ? t("All teams") : undefined,
        },
        { label: t("In progress"), value: formatCount(q.conversationInProgress) },
        {
          label: t("Agents online"),
          value: `${formatCount(q.staffOnline)} / ${formatCount(q.totalStaff)}`,
        },
        { label: t("Resolved to date"), value: formatCount(q.resolved) },
      ],
    },
  ];
}

function resolvedBars(t: Translate, data: ReportData): ReportBlock[] {
  const days = data.resolved ?? [];
  if (!days.some((day) => day.resolvedCount)) {
    return [
      { kind: "empty", title: t("Resolved per day"), text: t("Nothing resolved in this range") },
    ];
  }
  return [
    {
      kind: "bars",
      title: t("Resolved per day"),
      series: [{ name: t("Resolved"), color: "primary" }],
      points: days.map((day) => ({
        label: formatBucket(day.date, "day"),
        values: [toNumber(day.resolvedCount) ?? 0],
      })),
    },
  ];
}

function responseTimeBars(t: Translate, data: ReportData, dateKey: string): ReportBlock[] {
  const points = (data.responseTimes ?? []).filter((p) => toNumber(p.averageResponseTime) !== null);
  if (points.length === 0) {
    return [{ kind: "empty", title: t("Response time"), text: t(NO_REPLIES) }];
  }
  const granularity = dateKey === "today" || dateKey === "yesterday" ? "hour" : "day";
  return [
    {
      kind: "bars",
      title: t("Response time"),
      note: t("Average first response, by when the conversation started"),
      series: [{ name: t("Avg first response"), color: "primary" }],
      points: points.map((p) => ({
        label: formatBucket(p.period, granularity),
        values: [toNumber(p.averageResponseTime) ?? 0],
      })),
      unit: "seconds",
    },
  ];
}

function deliveryBars(t: Translate, data: ReportData): ReportBlock[] {
  const trend = data.deliveryTrend;
  const points = trend?.trend ?? [];
  if (!points.some((p) => p.deliveredMessages || p.failedMessages)) {
    return [
      { kind: "empty", title: t("Delivery trend"), text: t("No messages sent in this range") },
    ];
  }
  const granularity = trend?.granularity === "hour" ? "hour" : "day";
  return [
    {
      kind: "bars",
      title: t("Delivery trend"),
      series: [
        { name: t("Delivered"), color: "primary" },
        { name: t("Failed"), color: "destructive" },
      ],
      points: points.map((p) => ({
        label: formatBucket(p.time, granularity),
        values: [toNumber(p.deliveredMessages) ?? 0, toNumber(p.failedMessages) ?? 0],
      })),
    },
  ];
}

function agentsTable(t: Translate, data: ReportData): ReportBlock[] {
  const agents = [...(data.staff ?? [])].sort(
    (a, b) => (toNumber(b.totalMessagesHandled) ?? 0) - (toNumber(a.totalMessagesHandled) ?? 0),
  );
  if (agents.length === 0) return [];
  return [
    {
      kind: "table",
      title: t("Agents"),
      note: t("Sorted by messages handled"),
      columns: [
        { label: t("Agent") },
        { label: t("Messages"), align: "right" },
        { label: t("Avg first response"), align: "right" },
        { label: t("Active"), align: "right" },
        { label: t("Resolved"), align: "right" },
      ],
      rows: agents.map((agent) => [
        agent.staff.name,
        formatCount(agent.totalMessagesHandled),
        formatDuration(agent.averageResponseTime) ?? "—",
        formatCount(agent.totalAssignedConversations),
        formatCount(agent.totalClosedConversations),
      ]),
    },
  ];
}

function teamsTable(t: Translate, data: ReportData): ReportBlock[] {
  const teams = data.teams ?? [];
  if (teams.length === 0) return [];
  return [
    {
      kind: "table",
      title: t("Teams"),
      columns: [
        { label: t("Team") },
        { label: t("Members"), align: "right" },
        { label: t("Messages sent"), align: "right" },
        { label: t("Active conversations"), align: "right" },
        { label: t("Avg first response"), align: "right" },
      ],
      rows: teams.map((team) => [
        team.teamName,
        `${formatCount(team.teamMembers)} (${formatCount(team.teamMembersOnline)} ${t("online")})`,
        formatCount(team.messagesSent),
        formatCount(team.assignedConversations),
        formatDuration(team.averageResponseTime) ?? "—",
      ]),
    },
  ];
}

function channelsTable(t: Translate, data: ReportData): ReportBlock[] {
  const channels = [...(data.channels ?? [])].sort(
    (a, b) => (toNumber(b.conversationCount) ?? 0) - (toNumber(a.conversationCount) ?? 0),
  );
  const total = channels.reduce((sum, c) => sum + (toNumber(c.conversationCount) ?? 0), 0);
  if (total === 0) return [];
  return [
    {
      kind: "table",
      title: t("Channels"),
      columns: [
        { label: t("Channel") },
        { label: t("Platform") },
        { label: t("Conversations"), align: "right" },
        { label: t("Share"), align: "right" },
      ],
      rows: channels.map((c) => {
        const count = toNumber(c.conversationCount) ?? 0;
        return [
          c.phone || c.ibaId || "—",
          label(t, c.sourcePlatform),
          formatCount(count),
          `${Math.round((count / total) * 100)}%`,
        ];
      }),
    },
  ];
}

function templatesTable(t: Translate, data: ReportData): ReportBlock[] {
  const templates = [...(data.templates?.templatePerformance ?? [])].sort(
    (a, b) => (toNumber(b.totalSent) ?? 0) - (toNumber(a.totalSent) ?? 0),
  );
  if (templates.length === 0) return [];
  const isFailing = (index: number) =>
    (toNumber(templates[index]?.failurePercentage) ?? 0) >= FAILING_RATE;
  return [
    {
      kind: "table",
      title: t("Templates"),
      note: t("Templates failing {rate}% or more are marked", { rate: FAILING_RATE }),
      columns: [
        { label: t("Template") },
        { label: t("Category") },
        { label: t("Sent"), align: "right" },
        { label: t("Delivered"), align: "right" },
        { label: t("Failed"), align: "right" },
        { label: t("Avg delivery"), align: "right" },
        { label: t("Last used"), align: "right" },
      ],
      rows: templates.map((template) => [
        (toNumber(template.failurePercentage) ?? 0) >= FAILING_RATE
          ? `${template.templateName}  (${t("Failing")})`
          : template.templateName,
        label(t, template.templateCategory),
        formatCount(template.totalSent),
        formatPercent(template.successPercentage) ?? "—",
        formatPercent(template.failurePercentage) ?? "—",
        formatDuration(template.avgDeliveryTimeSeconds) ?? "—",
        template.lastUsed ? dayjs(template.lastUsed).format("D MMM YYYY") : "—",
      ]),
      flagged: templates.map((_, index) => index).filter(isFailing),
    },
  ];
}

function teamDeliveryTable(t: Translate, data: ReportData): ReportBlock[] {
  const teams = [...(data.teamDelivery ?? [])]
    .filter((team) => toNumber(team.totalSent))
    .sort((a, b) => (toNumber(b.totalSent) ?? 0) - (toNumber(a.totalSent) ?? 0));
  if (teams.length === 0) return [];
  return [
    {
      kind: "table",
      title: t("Messages by team"),
      note: t("Every team, whatever team the report is filtered to"),
      columns: [
        { label: t("Team") },
        { label: t("Sent"), align: "right" },
        { label: t("Delivered"), align: "right" },
      ],
      rows: teams.map((team) => [
        team.teamName,
        formatCount(team.totalSent),
        formatPercent(team.successPercentage) ?? "—",
      ]),
    },
  ];
}

function needsAttention(t: Translate, data: ReportData): ReportBlock[] {
  const slowest = (data.staff ?? [])
    .map((agent) => ({ name: agent.staff.name, seconds: toNumber(agent.averageResponseTime) }))
    .filter((row): row is { name: string; seconds: number } => row.seconds !== null)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);
  const failing = (data.templates?.templatePerformance ?? [])
    .filter(
      (tpl) => (toNumber(tpl.totalSent) ?? 0) >= 20 && (toNumber(tpl.failurePercentage) ?? 0) > 0,
    )
    .sort((a, b) => (toNumber(b.failurePercentage) ?? 0) - (toNumber(a.failurePercentage) ?? 0))
    .slice(0, 5);
  const blocks: ReportBlock[] = [];
  if (slowest.length > 0) {
    blocks.push({
      kind: "table",
      title: t("Slowest first response"),
      columns: [{ label: t("Agent") }, { label: t("Avg first response"), align: "right" }],
      rows: slowest.map((row) => [row.name, formatDuration(row.seconds) ?? "—"]),
    });
  }
  if (failing.length > 0) {
    blocks.push({
      kind: "table",
      title: t("Highest template failure rate"),
      note: t("Templates sent at least 20 times"),
      columns: [
        { label: t("Template") },
        { label: t("Sent"), align: "right" },
        { label: t("Failed"), align: "right" },
      ],
      rows: failing.map((tpl) => [
        tpl.templateName,
        formatCount(tpl.totalSent),
        formatPercent(tpl.failurePercentage) ?? "—",
      ]),
    });
  }
  return blocks.length > 0 ? [{ kind: "section", title: t("Needs attention") }, ...blocks] : [];
}

/** Drops section headings with nothing under them, which a quiet range leaves behind. */
function withoutEmptySections(blocks: ReportBlock[]): ReportBlock[] {
  return blocks.filter((block, index) => {
    if (block.kind !== "section") return true;
    const next = blocks[index + 1];
    return next !== undefined && next.kind !== "section";
  });
}

export interface BuildContext {
  t: Translate;
  dateKey: string;
  teamId: string;
}

export function buildOverviewReport({ t, dateKey, teamId }: BuildContext, data: ReportData) {
  return withoutEmptySections([
    ...liveStats(t, data, teamId),
    { kind: "section", title: t("Conversations") },
    { kind: "stats", items: conversationStats(t, data) },
    { kind: "section", title: t("WhatsApp delivery") },
    { kind: "stats", items: deliveryStats(t, data) },
    { kind: "section", title: t("Trends") },
    ...resolvedBars(t, data),
    ...responseTimeBars(t, data, dateKey),
    ...deliveryBars(t, data),
    ...needsAttention(t, data),
  ] satisfies ReportBlock[]);
}

export function buildConversationsReport({ t, dateKey }: BuildContext, data: ReportData) {
  return withoutEmptySections([
    { kind: "section", title: t("Summary") },
    { kind: "stats", items: conversationStats(t, data) },
    { kind: "section", title: t("People") },
    ...agentsTable(t, data),
    ...teamsTable(t, data),
    { kind: "section", title: t("Patterns") },
    ...responseTimeBars(t, data, dateKey),
    ...channelsTable(t, data),
  ] satisfies ReportBlock[]);
}

export function buildMessagesReport({ t }: BuildContext, data: ReportData) {
  return withoutEmptySections([
    { kind: "section", title: t("Summary") },
    { kind: "stats", items: deliveryStats(t, data) },
    ...deliveryBars(t, data),
    { kind: "section", title: t("Breakdown") },
    ...templatesTable(t, data),
    ...teamDeliveryTable(t, data),
  ] satisfies ReportBlock[]);
}

export const reportBuilders = {
  overview: buildOverviewReport,
  conversations: buildConversationsReport,
  messages: buildMessagesReport,
} as const;

/**
 * The API reports response-time changes as an improvement (positive = faster); a
 * report reads better as the change in the time itself, so flip the sign.
 */
const asTimeChange = (improvement: Numeric) => {
  const value = toNumber(improvement);
  return value === null ? null : -value;
};

const CONVERSATION_STATUS: Record<string, string> = {
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  ASSIGNED: "In progress",
  UNASSIGNED: "Unassigned",
  UNRESOLVED: "Unresolved",
};

const STAFF_STATUS: Record<string, string> = {
  online: "Online",
  available: "Online",
  busy: "Busy",
  away: "Away",
};

const WEEK_NOTE = "Changes compare the last 7 days with the 7 before";

export function buildAgentReport(t: Translate, data: StaffDetailedConversationAnalytics) {
  const agent = data.userPerformance;
  const days = data.weeklyMessageStats ?? [];
  const recent = data.recentConversations ?? [];
  const blocks: ReportBlock[] = [
    { kind: "section", title: t("Summary"), note: t(WEEK_NOTE) },
    {
      kind: "stats",
      items: [
        {
          label: t("Messages handled"),
          value: formatCount(agent?.totalMessagesHandled),
          change: change(t, toNumber(agent?.messagesHandledRateByLastWeek), "up", "%", "last week"),
        },
        {
          label: t("Avg response time"),
          ...durationValue(t, agent?.averageResponseTime),
          change: change(
            t,
            asTimeChange(agent?.responseTimeRateByLastWeek),
            "down",
            "%",
            "last week",
          ),
        },
        {
          label: t("Resolution rate"),
          value: formatPercent(data.metrics?.resolutionRate) ?? "0%",
          change: change(t, toNumber(agent?.resolutionRateByLastWeek), "up", " pts", "last week"),
        },
        {
          label: t("First response"),
          ...durationValue(t, data.metrics?.firstResponseTime),
          note: t("Average time to first reply"),
        },
        {
          label: t("Chats transferred"),
          value: formatCount(agent?.conversationsTransferred),
          note: t("Handed to other agents"),
        },
        {
          label: t("Chats received"),
          value: formatCount(agent?.conversationsRecieved),
          note: t("Handed over by other agents"),
        },
      ],
    },
    days.some((day) => toNumber(day.messageCount))
      ? {
          kind: "bars",
          title: t("Messages handled per day"),
          series: [{ name: t("Messages"), color: "primary" }],
          points: days.map((day) => ({
            label: formatBucket(day.date, "day"),
            values: [toNumber(day.messageCount) ?? 0],
          })),
        }
      : {
          kind: "empty",
          title: t("Messages handled per day"),
          text: t("No messages in this range"),
        },
  ];
  if (recent.length > 0) {
    blocks.push({
      kind: "table",
      title: t("Recent conversations"),
      columns: [
        { label: t("Customer") },
        { label: t("Duration"), align: "right" },
        { label: t("Last response"), align: "right" },
        { label: t("Status"), align: "right" },
      ],
      rows: recent.map((conversation) => [
        conversation.customer?.name || conversation.customer?.phone || "—",
        formatDuration(conversation.duration) ?? "—",
        conversation.lastRespondedAt
          ? dayjs(conversation.lastRespondedAt).format("D MMM YYYY, h:mm A")
          : t("Not responded yet"),
        t(
          CONVERSATION_STATUS[conversation.status?.toUpperCase() ?? ""] ??
            conversation.status ??
            "—",
        ),
      ]),
    });
  }
  return blocks;
}

export function buildTeamReport(t: Translate, data: TeamDetailedMetrics) {
  const members = [...(data.members ?? [])].sort(
    (a, b) => (toNumber(b.messagesHandled) ?? 0) - (toNumber(a.messagesHandled) ?? 0),
  );
  const blocks: ReportBlock[] = [
    { kind: "section", title: t("Summary"), note: t(WEEK_NOTE) },
    {
      kind: "stats",
      items: [
        {
          label: t("Members"),
          value: formatCount(data.teamMembers),
          note: t("{count} online", { count: formatCount(data.teamMembersOnline) }),
        },
        { label: t("Active chats"), value: formatCount(data.activeChats) },
        {
          label: t("Avg first response"),
          ...durationValue(t, data.averageResponseTime),
          change: change(
            t,
            asTimeChange(data.averageResponseTimeComparedToLastWeek),
            "down",
            "%",
            "last week",
          ),
        },
        {
          label: t("Resolution rate"),
          value: formatPercent(data.resolutionRate) ?? "0%",
          change: change(
            t,
            toNumber(data.resolutionRateComparedToLastWeek),
            "up",
            " pts",
            "last week",
          ),
        },
      ],
    },
  ];
  if (members.length > 0) {
    blocks.push({
      kind: "table",
      title: t("Members"),
      note: t("Sorted by messages handled"),
      columns: [
        { label: t("Agent") },
        { label: t("Status") },
        { label: t("Messages"), align: "right" },
        { label: t("Avg first response"), align: "right" },
        { label: t("Active chats"), align: "right" },
      ],
      rows: members.map((member) => [
        member.name,
        t(STAFF_STATUS[member.onlineStatus?.toLowerCase() ?? ""] ?? "Offline"),
        formatCount(member.messagesHandled),
        formatDuration(member.averageResponseTime) ?? "—",
        formatCount(member.staffActiveChats),
      ]),
    });
  }
  return blocks;
}
