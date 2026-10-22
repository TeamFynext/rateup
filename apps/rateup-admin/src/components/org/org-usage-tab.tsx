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
import { packAllowance } from "@/components/org/packs";
import { formatCompact, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

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
          Per day
        </SectionHeading>
        <DailyTrend daily={query.data.daily} fetching={query.isPlaceholderData} />
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
          <p className="-mt-3 text-xs text-muted-foreground">
            Analytics only. Plans are limited by active contacts and campaign credits.
          </p>
          {counters ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
              <StatFigure
                value={formatCompact(counters.meteredConversationsThisMonth)}
                label="Meta conversations, month"
              />
              <StatFigure
                value={formatCompact(counters.meteredConversationsThisYear)}
                label="Meta conversations, year"
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
          <SectionHeading>Packs</SectionHeading>
          {packs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packs in date.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {packs.map((pack) => (
                <li key={pack.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pack.name}</p>
                    <p className="text-xs text-muted-foreground">{packAllowance(pack)}</p>
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

/** The plan's meters and limits; shared with the org overview. */
export function UsageMeters({ usage, className }: { usage: OrgUsage; className?: string }) {
  const { limits, activeContacts: contacts, campaignCredits: credits } = usage;
  return (
    <div className={className ?? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
      <UsageMeter
        label="Active contacts"
        metered={contacts.metered}
        used={contacts.used}
        max={contacts.max}
        remaining={contacts.remaining}
        exceeded={contacts.exhausted}
        hint={`this month${contacts.addonContacts ? `, ${formatNumber(contacts.addonContacts)} from packs` : ""}`}
      />
      <UsageMeter
        label="Campaign credits"
        metered={credits.metered}
        used={credits.planUsed}
        max={credits.planMax}
        remaining={credits.remaining}
        exceeded={credits.exhausted}
        hint={`plan credits this month${credits.packRemaining ? `, ${formatNumber(credits.packRemaining)} left in packs` : ""}`}
      />
      <UsageMeter label="Users" {...limits.users} hint="seats, invites included" />
      <UsageMeter label="Teams" {...limits.teams} />
      <UsageMeter label="Form responses" {...limits.formResponses} hint="this month" />
      {limits.orders && <UsageMeter label="Shop orders" {...limits.orders} hint="this month" />}
    </div>
  );
}

const SERIES = [
  { key: "activeContacts", label: "New active contacts", total: "contacts became active" },
  { key: "campaignCredits", label: "Campaign credits", total: "campaign credits used" },
] as const;

function DailyTrend({ daily, fetching }: { daily: OrgUsage["daily"]; fetching: boolean }) {
  return (
    <div className={cn("flex flex-col gap-8 transition-opacity", fetching && "opacity-60")}>
      {SERIES.map((series) => {
        const total = daily.reduce((sum, day) => sum + day[series.key], 0);
        const busiest = daily.reduce((best, day) => Math.max(best, day[series.key]), 0);
        return (
          <div key={series.key} className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {series.label}
            </p>
            <BlockChart
              height={132}
              showValues={daily.length <= 31}
              data={daily.map((day, index) => ({
                label: dayjs(day.date).format("D MMM"),
                value: day[series.key],
                partial: index === daily.length - 1,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              {formatNumber(total)} {series.total} over {daily.length} days · busiest day{" "}
              {formatNumber(busiest)} · today is still counting
            </p>
          </div>
        );
      })}
    </div>
  );
}
