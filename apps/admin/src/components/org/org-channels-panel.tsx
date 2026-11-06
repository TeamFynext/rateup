import { IconBrandInstagram, IconBrandMessenger, IconBrandWhatsapp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import type { OrgChannel } from "@/api/orgs.api";
import { orgChannelsQueryOptions } from "@/api/orgs.query";
import { CopyButton } from "@/components/ds/copy-button";
import { DetailList } from "@/components/ds/detail-list";
import { SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { ErrorState } from "@/components/ds/query-states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The same settings row carries WhatsApp, and optionally the Facebook page and Instagram. */
function channelTitle(channel: OrgChannel) {
  if (channel.phone) return channel.phoneDisplayName || channel.phone;
  if (channel.igUserName) return `@${channel.igUserName}`;
  return channel.fbUserName || "Channel";
}

function ChannelCard({ channel }: { channel: OrgChannel }) {
  const active = channel.status === "ACTIVE";
  return (
    <li className="flex min-w-0 flex-col gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-mint text-tone-mint-accent">
          <IconBrandWhatsapp className="size-5" stroke={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{channelTitle(channel)}</p>
          <p className="truncate text-xs text-muted-foreground tabular">
            {channel.phone ?? "No number"} · {channel.type}
          </p>
        </div>
        <Pill tone={active ? "positive" : "muted"}>{active ? "Active" : channel.status}</Pill>
      </div>
      <DetailList
        className="gap-y-3 sm:grid-cols-3"
        items={[
          { label: "WABA id", value: channel.wabaId && <CopyButton value={channel.wabaId} /> },
          {
            label: "Phone number id",
            value: channel.phoneId && <CopyButton value={channel.phoneId} />,
          },
          {
            label: "Send rate",
            value: channel.messagesPerSecond ? `${channel.messagesPerSecond}/s` : "Default (80/s)",
          },
          { label: "Payments", value: channel.paymentMethod.toLowerCase().replace("_", " ") },
          { label: "Connected", value: formatDate(channel.createdAt) },
        ]}
      />
      {(channel.fbPageId || channel.ibaId) && (
        <div className="flex flex-wrap gap-2">
          {channel.fbPageId && (
            <Pill tone="outline">
              <IconBrandMessenger className="size-3.5" />
              {channel.fbUserName ?? "Facebook page"}
            </Pill>
          )}
          {channel.ibaId && (
            <Pill tone="outline">
              <IconBrandInstagram className="size-3.5" />
              {channel.igUserName ? `@${channel.igUserName}` : "Instagram"}
            </Pill>
          )}
        </div>
      )}
    </li>
  );
}

/** Every connected channel, compact enough to sit on the org overview. */
export function OrgChannelsPanel({ orgId, className }: { orgId: string; className?: string }) {
  const query = useQuery(orgChannelsQueryOptions(orgId));

  return (
    <Panel className={cn("flex flex-col gap-4", className)}>
      <SectionHeading>
        Channels{query.data && query.data.length > 0 ? ` · ${query.data.length}` : ""}
      </SectionHeading>
      {query.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} className="py-8" />
      ) : query.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No WhatsApp, Instagram or Messenger channel connected.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {query.data.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
