import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";

import type { OrgUsage, UsageDays } from "@/api/orgs.api";
import { orgUsageQueryOptions } from "@/api/orgs.query";
import { BlockChart } from "@/components/ds/block-chart";
import { FilterChips } from "@/components/ds/filter-chips";
import { SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { ErrorState, PanelSkeleton } from "@/components/ds/query-states";
import { StatFigure } from "@/components/ds/stat-figure";
import { UsageMeter } from "@/components/ds/usage-meter";
import { OrgTemplateMessages } from "@/components/org/org-template-messages";
import { formatCompact, formatDate, formatNumber, formatRelative } from "@/lib/format";

export function OrgUsageTab({ orgId }: { orgId: string }) {
  const [days, setDays] = useState<UsageDays>(30);
  const query = useQuery(orgUsageQueryOptions(orgId, days));

  if (query.isPending) return <PanelSkeleton panels={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { packs, counters } = query.data;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <SectionHeading>Plan limits</SectionHeading>
        <UsageMeters usage={query.data} />
      </section>

      <Panel className="flex flex-col gap-5">
        <SectionHeading
          action={
            <FilterChips
              chips={[
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
              ]}
              value={String(days) as "30" | "90"}
              onChange={(value) => setDays(Number(value) as UsageDays)}
              className="mx-0 px-0 pb-0"
            />
          }
        >
          Conversations per day
        </SectionHeading>
        <ConversationTrend daily={query.data.daily} fetching={query.isPlaceholderData} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel className="flex flex-col gap-6 xl:col-span-2">
          <SectionHeading
            action={
              counters && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatRelative(counters.updatedAt)}
                </span>
              )
            }
          >
            Counters
          </SectionHeading>
          {counters ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
              <StatFigure
                value={formatCompact(counters.meteredConversationsThisMonth)}
                label="Metered conversations, month"
              />
              <StatFigure
                value={formatCompact(counters.meteredConversationsThisYear)}
                label="Metered conversations, year"
              />
              <StatFigure
                value={formatCompact(counters.inboxConversationsThisMonth)}
                label="Inbox tickets, month"
              />
              <StatFigure
                value={formatCompact(counters.templateMessagesThisMonth)}
                label="Template messages, month"
              />
              <StatFigure value={formatCompact(counters.messages)} label="Messages, all time" />
              <StatFigure value={formatCompact(counters.campaigns)} label="Campaigns" />
              <StatFigure
                value={formatCompact(counters.automationTriggersThisMonth)}
                label="Automation triggers, month"
              />
              <StatFigure
                value={formatCompact(counters.whatsappSurveyResponsesThisMonth)}
                label="WhatsApp survey replies, month"
              />
              <StatFigure value={formatCompact(counters.aiTokens)} label="AI tokens" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No usage has been recorded yet.</p>
          )}
          {counters?.lastMonthlyReset && (
            <p className="text-xs text-muted-foreground">
              Monthly counters last reset {formatDate(counters.lastMonthlyReset)}.
            </p>
          )}
        </Panel>

        <Panel className="flex flex-col gap-6">
          <SectionHeading>Conversation packs</SectionHeading>
          {packs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packs in date.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {packs.map((pack) => (
                <li key={pack.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pack.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Bought {formatDate(pack.boughtAt)} · runs out {formatDate(pack.expiresAt)}
                    </p>
                  </div>
                  <Pill tone="brand">×{pack.quantity}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <OrgTemplateMessages orgId={orgId} />
    </div>
  );
}

/** The four plan limits as meters; shared with the org overview. */
export function UsageMeters({ usage, className }: { usage: OrgUsage; className?: string }) {
  const { limits, packs, conversationPeriod } = usage;
  const period = conversationPeriod === "annual" ? "this year" : "this month";
  return (
    <div className={className ?? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"}>
      <UsageMeter
        label="Conversations"
        {...limits.conversations}
        hint={`${period}${packs.length ? ", packs included" : ""}`}
      />
      <UsageMeter label="Users" {...limits.users} hint="seats, invites included" />
      <UsageMeter label="Teams" {...limits.teams} />
      <UsageMeter label="Form responses" {...limits.formResponses} hint="this month" />
    </div>
  );
}

function ConversationTrend({ daily, fetching }: { daily: OrgUsage["daily"]; fetching: boolean }) {
  const total = daily.reduce((sum, day) => sum + day.conversations, 0);
  const busiest = daily.reduce((best, day) => Math.max(best, day.conversations), 0);
  return (
    <div className={fetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <BlockChart
        showValues={daily.length <= 31}
        data={daily.map((day, index) => ({
          label: dayjs(day.date).format("D MMM"),
          value: day.conversations,
          partial: index === daily.length - 1,
        }))}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        {formatNumber(total)} metered conversations over {daily.length} days · busiest day{" "}
        {formatNumber(busiest)} · today is still counting
      </p>
    </div>
  );
}
