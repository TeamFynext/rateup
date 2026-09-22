import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import type { OrgSummary } from "@/api/orgs.api";
import { orgQueryOptions } from "@/api/orgs.query";
import { CopyButton } from "@/components/ds/copy-button";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { PageTabs } from "@/components/ds/page-tabs";
import { PlanPill, Pill, SubscriptionPill } from "@/components/ds/pill";
import { ErrorState } from "@/components/ds/query-states";
import { OrgActivityTab } from "@/components/org/org-activity-tab";
import { OrgBillingTab } from "@/components/org/org-billing-tab";
import { OrgChannelsTab } from "@/components/org/org-channels-tab";
import { OrgMembersTab } from "@/components/org/org-members-tab";
import { OrgMessagesTab } from "@/components/org/org-messages-tab";
import { OrgOverviewTab } from "@/components/org/org-overview-tab";
import { OrgUsageTab } from "@/components/org/org-usage-tab";
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
] as const;
type OrgTab = (typeof TABS)[number];
const TAB_LABELS: Record<OrgTab, string> = {
  overview: "Overview",
  members: "Members & teams",
  usage: "Usage",
  billing: "Billing",
  messages: "Messages",
  channels: "Channels",
  activity: "Activity",
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
              {org.pausedByCustomer && <Pill tone="warning">Paused by customer</Pill>}
            </div>
          </div>
        </div>

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
      </header>

      <PageTabs<OrgTab>
        value={tab}
        onChange={(value) =>
          void navigate({
            search: { tab: value === "overview" ? undefined : value },
            replace: true,
          })
        }
        tabs={TABS.map((key) => ({
          value: key,
          label: TAB_LABELS[key],
          content: tabContent(key, org),
        }))}
      />
    </div>
  );
}

function tabContent(tab: OrgTab, org: OrgSummary) {
  switch (tab) {
    case "overview":
      return <OrgOverviewTab org={org} />;
    case "members":
      return <OrgMembersTab orgId={org.id} />;
    case "usage":
      return <OrgUsageTab orgId={org.id} />;
    case "billing":
      return <OrgBillingTab orgId={org.id} />;
    case "messages":
      return <OrgMessagesTab orgId={org.id} />;
    case "channels":
      return <OrgChannelsTab orgId={org.id} />;
    case "activity":
      return <OrgActivityTab orgId={org.id} />;
  }
}
