import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconClock,
  IconClock2,
  IconFileTypePdf,
  IconLoader2,
  IconMessageCircle,
  IconRefresh,
  IconTarget,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { endFreshAnalytics, requestFreshAnalytics } from "@/backend/analytics/analyticsFilter";
import { useGetStaffDetailedConversationAnalytics } from "@/backend/conversation/conversation.query";
import { staffKeys } from "@/backend/org/org.keys";
import { BackLink } from "@/components/common/back-link.tsx";
import { type StatChange, StatTile } from "@/components/common/StatTile.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { DateSelector } from "@/components/whatsapp/inbox/analytics/DateRangeSelector.tsx";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

import { AnalyticsCard } from "./kit/AnalyticsCard.tsx";
import { AnalyticsHeader, AnalyticsToolbar } from "./kit/AnalyticsHeader.tsx";
import { TrendBars } from "./kit/charts.tsx";
import {
  formatBucket,
  formatCount,
  formatDuration,
  formatPercent,
  type Numeric,
  toNumber,
} from "./kit/format.ts";
import { StaffAvatar } from "./kit/StaffAvatar.tsx";
import { ConversationStatusBadge, StaffStatusBadge } from "./kit/StatusBadges.tsx";
import { TileGroup } from "./kit/TileGroup.tsx";
import { exportAgentReport } from "./report/exportReport.ts";

const ICON = "size-4 text-muted-foreground";

/** One agent's numbers: `/dashboard/analytics/$staffid`. */
export function AnalyticsPage() {
  const { staffid } = useParams({ strict: false });
  const [day, setDay] = useState(7);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  const query = useGetStaffDetailedConversationAnalytics(staffid ?? "", { days: day });
  const analytics = query.data;
  const agent = analytics?.userPerformance;

  function refresh() {
    requestFreshAnalytics();
    queryClient
      .invalidateQueries({
        queryKey: staffKeys.detailedConversationAnalytics(staffid, { days: day }),
        refetchType: "all",
      })
      .finally(endFreshAnalytics);
  }

  async function exportPdf() {
    if (!analytics) return;
    setIsExporting(true);
    try {
      await exportAgentReport(queryClient, analytics, day);
    } catch (error) {
      console.error(error);
      toast.error(t("The report could not be created. Try again in a moment."));
    } finally {
      setIsExporting(false);
    }
  }

  // The week-on-week figures always compare the last 7 days with the 7 before,
  // whatever range is picked, so they say "last week" rather than "previous period".
  const vsLastWeek = t("vs last week");
  const weekChange = (
    value: Numeric,
    goodWhen: StatChange["goodWhen"],
    unit?: string,
  ): StatChange | undefined => {
    const number = toNumber(value);
    return number === null ? undefined : { value: number, goodWhen, label: vsLastWeek, unit };
  };
  // The API reports response time as an improvement (positive = faster); the tile
  // shows the change in the time itself.
  const responseImprovement = toNumber(agent?.responseTimeRateByLastWeek);

  const days = analytics?.weeklyMessageStats ?? [];
  const recent = analytics?.recentConversations ?? [];

  return (
    <div className="flex flex-col gap-3">
      {query.isPending ? (
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
      ) : (
        <AnalyticsHeader
          back={
            <BackLink
              to="/dashboard/analytics"
              search={{ tab: "conversations", view: "agents" }}
              label={t("Agents")}
              iconOnly
            />
          }
          leading={
            <StaffAvatar name={agent?.name} photo={agent?.profilePhoto} className="size-10" />
          }
          title={agent?.name}
          badge={<StaffStatusBadge status={agent?.status} />}
          description={agent?.email}
        />
      )}
      <AnalyticsToolbar>
        <DateSelector days={day} setDays={setDay} />
        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" onClick={refresh} disabled={query.isFetching}>
            <IconRefresh className={query.isFetching ? "animate-spin" : undefined} />
            {t("Refresh")}
          </Button>
          <Button variant="outline" onClick={exportPdf} disabled={!analytics || isExporting}>
            {isExporting ? <IconLoader2 className="animate-spin" /> : <IconFileTypePdf />}
            {isExporting ? t("Preparing report…") : t("PDF report")}
          </Button>
        </div>
      </AnalyticsToolbar>

      <div className="flex flex-col gap-6 pt-1">
        <TileGroup query={query} count={6} columns={3}>
          <StatTile
            label={t("Messages handled")}
            value={formatCount(agent?.totalMessagesHandled)}
            icon={<IconMessageCircle className={ICON} />}
            change={weekChange(agent?.messagesHandledRateByLastWeek, "up")}
          />
          <StatTile
            label={t("Avg response time")}
            value={formatDuration(agent?.averageResponseTime)}
            emptyValue={t("No replies yet")}
            icon={<IconClock className={ICON} />}
            change={
              responseImprovement === null
                ? undefined
                : { value: -responseImprovement, goodWhen: "down", label: vsLastWeek }
            }
          />
          <StatTile
            label={t("Resolution rate")}
            value={formatPercent(analytics?.metrics?.resolutionRate) ?? "0%"}
            icon={<IconTarget className={ICON} />}
            change={weekChange(agent?.resolutionRateByLastWeek, "up", " pts")}
          />
          <StatTile
            label={t("First response")}
            value={formatDuration(analytics?.metrics?.firstResponseTime)}
            emptyValue={t("No replies yet")}
            note={t("Average time to first reply")}
            icon={<IconClock2 className={ICON} />}
          />
          <StatTile
            label={t("Chats transferred")}
            value={formatCount(agent?.conversationsTransferred)}
            note={t("Handed to other agents")}
            icon={<IconArrowForwardUp className={ICON} />}
          />
          <StatTile
            label={t("Chats received")}
            value={formatCount(agent?.conversationsRecieved)}
            note={t("Handed over by other agents")}
            icon={<IconArrowBackUp className={ICON} />}
          />
        </TileGroup>

        <AnalyticsCard
          title={t("Messages handled per day")}
          description={t("Replies this agent sent each day")}
          query={query}
          isEmpty={!days.some((d) => toNumber(d.messageCount))}
          emptyTitle={t("No messages in this range")}
          emptyDescription={t("Try a longer date range.")}
        >
          <TrendBars
            data={days}
            xKey="date"
            yKey="messageCount"
            label={t("Messages")}
            formatX={(value) => formatBucket(value, "day")}
          />
        </AnalyticsCard>

        <AnalyticsCard
          title={t("Recent conversations")}
          description={t("The last conversations this agent worked on")}
          query={query}
          isEmpty={recent.length === 0}
          emptyTitle={t("No conversations yet")}
          emptyDescription={t("Conversations this agent works on will show up here.")}
          skeleton={<Skeleton className="h-48 w-full" />}
        >
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Customer")}</TableHead>
                  <TableHead>{t("Duration")}</TableHead>
                  <TableHead>{t("Last response")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <ContactAvatar
                          name={conversation.customer?.name || conversation.customer?.phone}
                          size="sm"
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {conversation.customer?.name || conversation.customer?.phone}
                          </span>
                          {conversation.customer?.name && (
                            <span className="truncate text-xs text-muted-foreground">
                              {conversation.customer.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDuration(conversation.duration) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {conversation.lastRespondedAt
                        ? formatToRelativeTime(conversation.lastRespondedAt, true)
                        : t("Not responded yet")}
                    </TableCell>
                    <TableCell>
                      <ConversationStatusBadge status={conversation.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
