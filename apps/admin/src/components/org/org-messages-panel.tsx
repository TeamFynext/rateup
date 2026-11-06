import { IconBrandWhatsapp, IconMail } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orgCustomerMessagesQueryOptions, type MessageStatus } from "@/api/engage.api";
import { SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { Pill, type PillTone } from "@/components/ds/pill";
import { ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { formatDateTime, formatRelative, humanize } from "@/lib/format";

const TONE: Record<MessageStatus, PillTone> = {
  QUEUED: "muted",
  SENT: "positive",
  FAILED: "negative",
  SKIPPED: "outline",
};

/** What RateUp itself has sent this org's people: onboarding steps and broadcasts. */
export function OrgMessagesPanel({ orgId }: { orgId: string }) {
  const query = useQuery(orgCustomerMessagesQueryOptions(orgId));
  return (
    <Panel>
      <div className="flex flex-col gap-6">
        <SectionHeading>From RateUp</SectionHeading>
        {query.isPending ? (
          <ListSkeleton rows={2} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No onboarding emails or broadcasts sent to this organisation yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {query.data.slice(0, 12).map((m) => {
              const Icon = m.channel === "EMAIL" ? IconMail : IconBrandWhatsapp;
              return (
                <li key={m.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" stroke={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.label}</p>
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={formatDateTime(m.sentAt ?? m.createdAt)}
                    >
                      {m.user.name ?? m.user.email} · {formatRelative(m.sentAt ?? m.createdAt)}
                      {m.skipReason ? ` · ${humanize(m.skipReason)}` : ""}
                      {m.error ? ` · ${m.error}` : ""}
                    </p>
                  </div>
                  <Pill tone={TONE[m.status]}>{humanize(m.status)}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
