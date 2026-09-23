import { IconArrowLeft, IconBan } from "@tabler/icons-react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import {
  orgDeletionQueryOptions,
  orgNotesQueryOptions,
  orgSubscriptionQueryOptions,
} from "@/api/org-actions.api";
import type { OrgSummary } from "@/api/orgs.api";
import {
  planOptionsQueryOptions,
  orgActivityQueryOptions,
  orgChannelsQueryOptions,
  orgInvoicesQueryOptions,
  orgMembersQueryOptions,
  orgMessageStatsQueryOptions,
  orgOrdersQueryOptions,
  orgQueryOptions,
  orgUsageQueryOptions,
} from "@/api/orgs.query";
import { CopyButton } from "@/components/ds/copy-button";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { PageTabs } from "@/components/ds/page-tabs";
import { PlanPill, Pill, SubscriptionPill } from "@/components/ds/pill";
import { ErrorState } from "@/components/ds/query-states";
import { OrgActionDialogs, type OrgAction } from "@/components/org/actions/org-action-dialogs";
import { OrgManageMenu } from "@/components/org/actions/org-manage-menu";
import { OrgActivityTab } from "@/components/org/org-activity-tab";
import { OrgBillingTab } from "@/components/org/org-billing-tab";
import { OrgChannelsTab } from "@/components/org/org-channels-tab";
import { OrgDangerTab } from "@/components/org/org-danger-tab";
import { OrgMembersTab } from "@/components/org/org-members-tab";
import { OrgMessagesTab, presetRange } from "@/components/org/org-messages-tab";
import { OrgOverviewTab } from "@/components/org/org-overview-tab";
import { OrgUsageTab } from "@/components/org/org-usage-tab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorData } from "@/lib/apiError";
import { formatDate, formatRelative } from "@/lib/format";

const TABS = [
  "overview",
  "members",
  "usage",
  "billing",
  "messages",
  "channels",
  "activity",
  "danger",
] as const;
type OrgTab = (typeof TABS)[number];
const TAB_LABELS: Record<OrgTab, string> = {
  overview: "Overview",
  members: "Members & teams",
  usage: "Usage",
  billing: "Plan & billing",
  messages: "Messages",
  channels: "Channels",
  activity: "Activity",
  danger: "Danger zone",
};

export const Route = createFileRoute("/_app/orgs/$orgId")({
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined) }),
  loader: ({ context, params }) =>
    // Started on hover/navigation; the page renders its own error state if it fails.
    context.queryClient.prefetchQuery(orgQueryOptions(params.orgId)),
  component: OrgDetail,
});

function BackLink() {
  return (
    <Link
      to="/orgs"
      className="inline-flex w-fit items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
    >
      <IconArrowLeft className="size-3.5" />
      Organisations
    </Link>
  );
}

function OrgDetail() {
  const { orgId } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const query = useQuery(orgQueryOptions(orgId));
  const queryClient = useQueryClient();
  const [action, setAction] = useState<OrgAction | null>(null);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-8">
        <BackLink />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  if (query.isError) {
    const missing = getApiErrorData(query.error)?.code === "ORG_NOT_FOUND";
    return (
      <div className="flex flex-col gap-8">
        <BackLink />
        {missing ? (
          <ErrorState error={{ message: "This organisation doesn't exist, or was deleted." }} />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )}
      </div>
    );
  }

  const org = query.data;

  return (
    <div className="flex flex-col gap-8">
      <BackLink />

      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <EntityAvatar
            name={org.name}
            src={org.logo}
            className="size-14 rounded-2xl text-base after:rounded-2xl *:data-[slot=avatar-fallback]:rounded-2xl *:data-[slot=avatar-image]:rounded-2xl"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-[26px] leading-tight font-medium tracking-tight wrap-break-word">
              {org.name}
            </h1>
            <CopyButton value={org.id} />
            <div className="flex flex-wrap gap-2">
              <PlanPill plan={org.plan} />
              <SubscriptionPill status={org.status} expiresAt={org.expiresAt} />
              {org.suspendedAt && <Pill tone="negative">Suspended</Pill>}
              {org.pausedByCustomer && <Pill tone="warning">Paused by customer</Pill>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-5 lg:items-end">
          <OrgManageMenu
            onAction={setAction}
            suspended={!!org.suspendedAt}
            onPrefetch={() => {
              void queryClient.prefetchQuery(orgSubscriptionQueryOptions(org.id));
              void queryClient.prefetchQuery(planOptionsQueryOptions);
            }}
          />
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 lg:text-right">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">Owner</dt>
              <dd className="truncate font-medium">{org.owner.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="font-medium tabular">{formatDate(org.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last active</dt>
              <dd className="font-medium">
                {org.lastActiveAt ? formatRelative(org.lastActiveAt) : "Never"}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {org.suspendedAt && (
        <SuspendedBanner org={org} onRestore={() => setAction({ kind: "unsuspend" })} />
      )}

      <PageTabs<OrgTab>
        value={tab}
        onChange={(value) =>
          void navigate({
            search: { tab: value === "overview" ? undefined : value },
            replace: true,
            // A tab is not a new page; jumping to the top would lose the reader's place.
            resetScroll: false,
          })
        }
        tabs={TABS.map((key) => ({
          value: key,
          label: TAB_LABELS[key],
          content: tabContent(key, org, setAction),
          prefetch: () => prefetchTab(queryClient, key, org.id),
        }))}
      />

      <OrgActionDialogs orgId={org.id} org={org} action={action} onClose={() => setAction(null)} />
    </div>
  );
}

/**
 * What each tab opens with, fetched when its trigger is hovered or focused. By the time the
 * tab is clicked the data is usually in the cache, so it appears filled instead of passing
 * through a skeleton. Anything paged or filtered inside a tab loads on its own as before.
 */
function prefetchTab(queryClient: QueryClient, tab: OrgTab, orgId: string) {
  const warm = queryClient.prefetchQuery.bind(queryClient);
  switch (tab) {
    case "overview":
      return void warm(orgNotesQueryOptions(orgId));
    case "members":
      return void warm(orgMembersQueryOptions(orgId));
    case "usage":
      return void warm(orgUsageQueryOptions(orgId));
    case "billing":
      void warm(orgSubscriptionQueryOptions(orgId));
      void warm(orgUsageQueryOptions(orgId));
      void warm(orgOrdersQueryOptions(orgId, 1));
      // Read live from Razorpay, so it is the slowest of them and the most worth warming.
      return void warm(orgInvoicesQueryOptions(orgId));
    case "messages":
      return void warm(orgMessageStatsQueryOptions(orgId, presetRange(30)));
    case "channels":
      return void warm(orgChannelsQueryOptions(orgId));
    case "activity":
      return void warm(orgActivityQueryOptions(orgId, "customer", 1));
    case "danger":
      return void warm(orgDeletionQueryOptions(orgId));
  }
}

/** Red across the top of a suspended org, with the way out of it. */
function SuspendedBanner({ org, onRestore }: { org: OrgSummary; onRestore: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-negative/10 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
      <IconBan className="size-5 shrink-0 text-negative" stroke={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-negative">
          Suspended {formatRelative(org.suspendedAt)}
        </p>
        <p className="text-sm text-foreground/70">
          {org.suspendedReason ? `“${org.suspendedReason}”` : "No reason was recorded."} Nobody here
          can sign in, send a message or use the API.
        </p>
      </div>
      <Button variant="outline" className="h-10 shrink-0 rounded-xl px-4" onClick={onRestore}>
        Restore access
      </Button>
    </div>
  );
}

function tabContent(tab: OrgTab, org: OrgSummary, onAction: (action: OrgAction) => void) {
  switch (tab) {
    case "overview":
      return <OrgOverviewTab org={org} onAction={onAction} />;
    case "members":
      return <OrgMembersTab orgId={org.id} />;
    case "usage":
      return <OrgUsageTab orgId={org.id} />;
    case "billing":
      return <OrgBillingTab orgId={org.id} onAction={onAction} />;
    case "messages":
      return <OrgMessagesTab orgId={org.id} />;
    case "channels":
      return <OrgChannelsTab orgId={org.id} />;
    case "activity":
      return <OrgActivityTab orgId={org.id} />;
    case "danger":
      return <OrgDangerTab org={org} />;
  }
}
