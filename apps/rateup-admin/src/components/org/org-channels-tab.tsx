import { IconBrandInstagram, IconBrandMessenger, IconBrandWhatsapp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import type { OrgChannel } from "@/api/orgs.api";
import { orgChannelsQueryOptions } from "@/api/orgs.query";
import { CopyButton } from "@/components/ds/copy-button";
import { DetailList } from "@/components/ds/detail-list";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { formatDate } from "@/lib/format";

/** The same settings row carries WhatsApp, and optionally the Facebook page and Instagram. */
function channelTitle(channel: OrgChannel) {
  if (channel.phone) return channel.phoneDisplayName || channel.phone;
  if (channel.igUserName) return `@${channel.igUserName}`;
  return channel.fbUserName || "Channel";
}

function ChannelCard({ channel }: { channel: OrgChannel }) {
  const active = channel.status === "ACTIVE";
  return (
    <li className="flex min-w-0 flex-col gap-6 rounded-3xl border p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <IconBrandWhatsapp className="size-5" stroke={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{channelTitle(channel)}</p>
          <p className="truncate text-xs text-muted-foreground tabular">
            {channel.phone ?? "No number"} · {channel.type}
          </p>
        </div>
        <Pill tone={active ? "positive" : "muted"}>{active ? "Active" : channel.status}</Pill>
      </div>
      <DetailList
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

export function OrgChannelsTab({ orgId }: { orgId: string }) {
  const query = useQuery(orgChannelsQueryOptions(orgId));

  if (query.isPending) return <ListSkeleton rows={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No channels connected"
        description="This organisation hasn't connected WhatsApp, Instagram or Messenger."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
      {query.data.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </ul>
  );
}
