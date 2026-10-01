import type { QueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  getApiAnalyticsOverview,
  getDeliveredFailedTrend,
  getTeamOverview as getTeamDeliveryOverview,
  getTemplateOverview,
} from "@/backend/apiAnalytics/apianalytics.api";
import {
  getAverageConversationResponseTimeGraphData,
  getConversationAccountDistribution,
  getConversationOverView,
  getConversationQuickStats,
  getResolvedConversationStats,
  getStaffPerformanceonConversation,
  getTeamOverview,
  type StaffDetailedConversationAnalytics,
  type TeamDetailedMetrics,
} from "@/backend/conversation/conversation.api";
import { teamKeys } from "@/backend/org/org.keys";
import { userInfoQuery } from "@/backend/user/user.options";
import { previousRange } from "@/components/whatsapp/inbox/analytics/dateRangePresets.ts";
import i18n from "@/i18n.ts";
import { rateupIcon } from "@/utils/constants.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { type AnalyticsFilters, conversationFilter, deliveryFilter } from "../kit/filters.ts";
import {
  buildAgentReport,
  buildTeamReport,
  type ReportData,
  reportBuilders,
} from "./buildReport.ts";
import { loadReportImage } from "./loadImage.ts";
import type { Report, Translate } from "./reportModel.ts";

export type ReportTab = keyof typeof reportBuilders;

/** What each view's report needs, fetched in parallel. The API's cache answers most of it. */
async function loadData(tab: ReportTab, filters: AnalyticsFilters): Promise<ReportData> {
  const conversation = conversationFilter(filters);
  const delivery = deliveryFilter(filters);
  const previous = { ...conversation, dateRange: previousRange(filters.dateRange.range) };

  if (tab === "overview") {
    const [
      overview,
      previousOverview,
      quickStats,
      resolved,
      responseTimes,
      staff,
      deliveryOverview,
      deliveryTrend,
      templates,
    ] = await Promise.all([
      getConversationOverView(conversation),
      getConversationOverView(previous),
      getConversationQuickStats({ teamId: filters.teamId }),
      getResolvedConversationStats({ days: 7, ...conversation }),
      getAverageConversationResponseTimeGraphData(conversation),
      getStaffPerformanceonConversation(conversation),
      getApiAnalyticsOverview(delivery),
      getDeliveredFailedTrend(delivery),
      getTemplateOverview(delivery),
    ]);
    return {
      overview,
      previousOverview,
      quickStats,
      resolved,
      responseTimes,
      staff,
      delivery: deliveryOverview,
      deliveryTrend,
      templates,
    };
  }

  if (tab === "conversations") {
    const [overview, previousOverview, staff, teams, responseTimes, channels] = await Promise.all([
      getConversationOverView(conversation),
      getConversationOverView(previous),
      getStaffPerformanceonConversation(conversation),
      getTeamOverview(conversation),
      getAverageConversationResponseTimeGraphData(conversation),
      getConversationAccountDistribution(conversation),
    ]);
    return { overview, previousOverview, staff, teams, responseTimes, channels };
  }

  const [deliveryOverview, deliveryTrend, templates, teamDelivery] = await Promise.all([
    getApiAnalyticsOverview(delivery),
    getDeliveredFailedTrend(delivery),
    getTemplateOverview(delivery),
    getTeamDeliveryOverview({ ...delivery, teamId: "all" }),
  ]);
  return { delivery: deliveryOverview, deliveryTrend, templates, teamDelivery };
}

function describeRange(range: Date[]) {
  const [start, end] = range.map((date) => dayjs(date));
  if (!start || !end) return "";
  if (start.isSame(end, "day")) return start.format("D MMM YYYY");
  const sameYear = start.isSame(end, "year");
  return `${start.format(sameYear ? "D MMM" : "D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
}

/**
 * Draws a report with the org's branding and downloads it.
 *
 * Reports are always in English: the PDF's built-in font has no Arabic or Devanagari
 * glyphs, so a translated report would print as boxes. Names typed in those scripts
 * have the same limit.
 */
export async function downloadReport(
  queryClient: QueryClient,
  build: (t: Translate) => Report,
  filename: string,
) {
  // The org's name and logo come from the signed-in user's info, which the app
  // has almost always loaded already.
  const userInfo = await queryClient.fetchQuery(userInfoQuery()).catch(() => null);
  const org = userInfo && "data" in userInfo ? userInfo.data : null;
  const [orgLogo, rateupMark, { createReportPdf }] = await Promise.all([
    loadReportImage(org?.orgLogo ? getFileUrlFromKey(org.orgLogo) : undefined),
    loadReportImage(rateupIcon),
    // Loaded on demand: jsPDF is only needed by the few people who export.
    import("./renderPdf.ts"),
  ]);
  const t = englishT();
  const pdf = createReportPdf(build(t), {
    org: { name: org?.orgName ?? null, logo: orgLogo },
    rateupIcon: rateupMark,
    generated: t("Generated {date}", { date: dayjs().format("D MMM YYYY, h:mm A") }),
  });
  pdf.save(filename);
}

function englishT(): Translate {
  const english = i18n.getFixedT("en");
  return (key, values) => english(key, values);
}

/** Builds and downloads one of the section's views as a PDF report. */
export async function exportAnalyticsReport(
  queryClient: QueryClient,
  tab: ReportTab,
  filters: AnalyticsFilters,
) {
  const data = await loadData(tab, filters);
  const teams = queryClient.getQueryData<TeamsResponse>(teamKeys.byUser())?.data ?? [];

  await downloadReport(
    queryClient,
    (t) => {
      const teamName =
        filters.teamId === "all"
          ? t("All teams")
          : t("Team: {name}", {
              name: teams.find((team) => team.id === filters.teamId)?.name ?? "—",
            });
      const channelLabel: Record<string, string> = {
        all: t("All messages"),
        external: t("External API messages"),
        whatsapp: t("Campaign & Inbox messages"),
      };
      const titles: Record<ReportTab, string> = {
        overview: t("Overview"),
        conversations: t("Conversations"),
        messages: t("Messages"),
      };
      return {
        title: titles[tab],
        scope: [
          describeRange(filters.dateRange.range),
          teamName,
          ...(tab === "conversations" ? [] : [channelLabel[filters.apiType] ?? filters.apiType]),
        ],
        blocks: reportBuilders[tab](
          { t, dateKey: filters.dateRange.key, teamId: filters.teamId },
          data,
        ),
      };
    },
    `rateup-${tab}-${dayjs(filters.dateRange.range[0]).format("YYYY-MM-DD")}.pdf`,
  );
}

/** The drill-downs' range: `days` back from today, as the page describes it. */
function describeDays(days: number) {
  const end = dayjs();
  return describeRange([end.subtract(Math.max(days - 1, 0), "day").toDate(), end.toDate()]);
}

export const fileSlug = (name: string | undefined) =>
  (name ?? "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "report";

/** The agent page, from the data it already shows. */
export function exportAgentReport(
  queryClient: QueryClient,
  data: StaffDetailedConversationAnalytics,
  days: number,
) {
  const name = data.userPerformance?.name;
  return downloadReport(
    queryClient,
    (t) => ({
      title: name ?? t("Agent"),
      scope: [describeDays(days), data.userPerformance?.email ?? ""],
      blocks: buildAgentReport(t, data),
    }),
    `rateup-agent-${fileSlug(name)}-${dayjs().format("YYYY-MM-DD")}.pdf`,
  );
}

/** The team page, from the data it already shows. */
export function exportTeamReport(
  queryClient: QueryClient,
  data: TeamDetailedMetrics,
  days: number,
) {
  return downloadReport(
    queryClient,
    (t) => ({
      title: data.teamName ?? t("Team"),
      scope: [describeDays(days)],
      blocks: buildTeamReport(t, data),
    }),
    `rateup-team-${fileSlug(data.teamName)}-${dayjs().format("YYYY-MM-DD")}.pdf`,
  );
}
