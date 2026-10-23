import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { broadcastsQueryOptions, useCreateBroadcast, type Broadcast } from "@/api/engage.api";
import { PageHeading } from "@/components/ds/page-heading";
import { Pager } from "@/components/ds/pager";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { BroadcastStatusPill } from "@/components/engage/broadcast-status";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_app/engage/broadcasts/")({
  validateSearch: z.object({ page: z.coerce.number().int().min(1).optional().catch(undefined) }),
  component: BroadcastsPage,
});

const sent = (b: Broadcast) => (b.counts ? b.counts.email.SENT + b.counts.whatsapp.SENT : 0);

const COLUMNS: Column<Broadcast>[] = [
  {
    key: "name",
    header: "Broadcast",
    primary: true,
    cell: (b) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{b.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {b.emailSubject ?? b.waTemplateName ?? "No content yet"}
        </span>
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (b) => <BroadcastStatusPill broadcast={b} /> },
  {
    key: "channels",
    header: "Channels",
    hideBelow: "lg",
    cell: (b) => (
      <span className="text-muted-foreground">
        {b.channels.map((c) => (c === "EMAIL" ? "Email" : "WhatsApp")).join(" + ")}
      </span>
    ),
  },
  {
    key: "sent",
    header: "Sent",
    align: "right",
    cell: (b) => (
      <span className="tabular">{b.status === "DRAFT" ? "—" : formatNumber(sent(b))}</span>
    ),
  },
  {
    key: "when",
    header: "When",
    hideBelow: "lg",
    cell: (b) => (
      <span className="text-muted-foreground">
        {formatDateTime(b.startedAt ?? b.scheduledAt ?? b.createdAt)}
      </span>
    ),
  },
  {
    key: "by",
    header: "By",
    hideBelow: "xl",
    cell: (b) => <span className="text-muted-foreground">{b.createdByEmail}</span>,
  },
];

function BroadcastsPage() {
  const { page = 1 } = Route.useSearch();
  const navigate = useNavigate();
  const query = useQuery(broadcastsQueryOptions(page));
  const create = useCreateBroadcast();

  const startNew = () =>
    create.mutate(
      {
        name: "Untitled broadcast",
        channels: ["EMAIL"],
        audience: { plan: "any", segments: [] },
        emailSubject: null,
        emailBody: null,
        ctaLabel: null,
        ctaUrl: null,
        waTemplateName: null,
        waParams: [],
      },
      {
        onSuccess: (b) =>
          void navigate({ to: "/engage/broadcasts/$broadcastId", params: { broadcastId: b.id } }),
        onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't start a broadcast.")),
      },
    );

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Broadcasts"
        description="Newsletters and one-off announcements to the owners and admins of RateUp's customers. People who unsubscribed or bounced are left out automatically."
        actions={
          <Button className="h-9 rounded-lg px-4" onClick={startNew} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : <IconPlus />}
            New broadcast
          </Button>
        }
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState
          title="No broadcasts yet"
          description="Start with the monthly newsletter: what shipped, one customer story, one tip."
        />
      ) : (
        <>
          <ResponsiveTable
            rows={query.data.data}
            columns={COLUMNS}
            rowKey={(b) => b.id}
            rowLink={(b) => ({
              to: "/engage/broadcasts/$broadcastId",
              params: { broadcastId: b.id },
            })}
          />
          <Pager
            page={page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            fetching={query.isFetching}
            onPageChange={(next) =>
              void navigate({ to: ".", search: { page: next === 1 ? undefined : next } })
            }
          />
        </>
      )}
    </div>
  );
}
