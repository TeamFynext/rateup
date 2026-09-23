import { useQuery } from "@tanstack/react-query";

import { orgUsageQueryOptions } from "@/api/orgs.query";
import { Panel, SectionTitle } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { ErrorState, PanelSkeleton } from "@/components/ds/query-states";
import { StatFigure } from "@/components/ds/stat-figure";
import { UsageMeter } from "@/components/ds/usage-meter";
import { formatCompact, formatDate, formatRelative } from "@/lib/format";

export function OrgUsageTab({ orgId }: { orgId: string }) {
  const query = useQuery(orgUsageQueryOptions(orgId));

  if (query.isPending) return <PanelSkeleton panels={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { limits, packs, counters, conversationPeriod } = query.data;
  const period = conversationPeriod === "annual" ? "this year" : "this month";

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <SectionTitle>Plan limits</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          <UsageMeter
            label="Conversations"
            {...limits.conversations}
            hint={`${period}${packs.length ? ", packs included" : ""}`}
          />
          <UsageMeter label="Users" {...limits.users} hint="seats, invites included" />
          <UsageMeter label="Teams" {...limits.teams} />
          <UsageMeter label="Form responses" {...limits.formResponses} hint="this month" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel className="flex flex-col gap-6 xl:col-span-2">
          <SectionTitle
            action={
              counters && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatRelative(counters.updatedAt)}
                </span>
              )
            }
          >
            Counters
          </SectionTitle>
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
          <SectionTitle>Conversation packs</SectionTitle>
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
                  <Pill tone="ink">×{pack.quantity}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
