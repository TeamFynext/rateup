import { IconArrowRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { orgSubscriptionQueryOptions } from "@/api/org-actions.api";
import type { OrgActivityEntry, OrgSummary } from "@/api/orgs.api";
import {
  orgActivityQueryOptions,
  orgMembersQueryOptions,
  orgUsageQueryOptions,
} from "@/api/orgs.query";
import { CopyButton } from "@/components/ds/copy-button";
import { DetailList } from "@/components/ds/detail-list";
import { SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { SubscriptionPill } from "@/components/ds/pill";
import { ErrorState } from "@/components/ds/query-states";
import type { OrgAction } from "@/components/org/actions/org-action-dialogs";
import { FeaturesSummary } from "@/components/org/features-summary";
import { OrgChannelsPanel } from "@/components/org/org-channels-panel";
import { MemberRow } from "@/components/org/org-members-tab";
import { OrgNotesPanel } from "@/components/org/org-notes-panel";
import type { OrgTab } from "@/components/org/org-tabs";
import { UsageMeters } from "@/components/org/org-usage-tab";
import { groupByRole } from "@/components/org/roles";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
  isEffectivelyNever,
} from "@/lib/format";

const MEMBER_PREVIEW = 8;
const ACTIVITY_PREVIEW = 6;

function MoreLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {children}
      <IconArrowRight className="size-3.5" />
    </button>
  );
}

/**
 * The whole account on one page: usage against the plan, who is in it and in what role,
 * what the plan allows, channels, notes and the latest activity. Each section loads on its
 * own, so a slow one never holds the rest back; the tabs hold the full versions.
 */
export function OrgOverviewTab({
  org,
  onAction,
  onTab,
}: {
  org: OrgSummary;
  onAction: (action: OrgAction) => void;
  onTab: (tab: OrgTab) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div className="flex min-w-0 flex-col gap-6 xl:col-span-3">
        <UsageSection orgId={org.id} onTab={onTab} />
        <MembersSection orgId={org.id} onTab={onTab} />
        <OrgChannelsPanel orgId={org.id} />
      </div>
      <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
        <PlanSection org={org} onTab={onTab} />
        <OrgNotesPanel orgId={org.id} onAction={onAction} />
        <ActivitySection orgId={org.id} onTab={onTab} />
        <BusinessSection org={org} />
      </div>
    </div>
  );
}

function UsageSection({ orgId, onTab }: { orgId: string; onTab: (tab: OrgTab) => void }) {
  const query = useQuery(orgUsageQueryOptions(orgId));
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading action={<MoreLink onClick={() => onTab("usage")}>Usage</MoreLink>}>
        Usage against plan
      </SectionHeading>
      {query.isPending ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} className="py-8" />
      ) : (
        <UsageMeters usage={query.data} className="grid grid-cols-1 gap-4 sm:grid-cols-2" />
      )}
    </section>
  );
}

function MembersSection({ orgId, onTab }: { orgId: string; onTab: (tab: OrgTab) => void }) {
  const query = useQuery(orgMembersQueryOptions(orgId));
  const members = query.data?.members ?? [];
  const groups = groupByRole(members);
  // Most access first, so the preview leads with the people support would ask for.
  const preview = groups.flatMap((group) => group.members).slice(0, MEMBER_PREVIEW);

  return (
    <Panel className="flex flex-col gap-4 p-0 md:p-0">
      <div className="flex flex-col gap-3 px-5 pt-5 md:px-6 md:pt-6">
        <SectionHeading
          action={
            members.length > 0 && (
              <MoreLink onClick={() => onTab("members")}>
                {members.length > MEMBER_PREVIEW ? `All ${members.length}` : "Teams & invites"}
              </MoreLink>
            )
          }
        >
          Members & roles{query.data ? ` · ${members.length}` : ""}
        </SectionHeading>
        {groups.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {groups.map((group) => `${group.members.length} ${group.label}`).join(" · ")}
            {query.data && ` · ${query.data.teams.length} teams`}
            {query.data?.invitations.length ? ` · ${query.data.invitations.length} invited` : ""}
          </p>
        )}
      </div>
      {query.isPending ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          className="mx-5 mb-5 py-8"
        />
      ) : members.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No members.</p>
      ) : (
        <ul className="flex flex-col divide-y border-t">
          {preview.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PlanSection({ org, onTab }: { org: OrgSummary; onTab: (tab: OrgTab) => void }) {
  const query = useQuery(orgSubscriptionQueryOptions(org.id));
  const subscription = org.subscription;
  const expires = subscription?.expiresAt;

  return (
    <Panel className="flex flex-col gap-5">
      <SectionHeading action={<MoreLink onClick={() => onTab("billing")}>Plan & billing</MoreLink>}>
        Plan
      </SectionHeading>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xl font-bold tracking-[-0.015em]">
          {org.plan?.name ?? "No plan"}
        </span>
        <SubscriptionPill status={org.status} expiresAt={org.expiresAt} />
      </div>
      {subscription ? (
        <DetailList
          className="gap-y-3"
          items={[
            {
              label: "Expires",
              value: expires && isEffectivelyNever(expires) ? "Never" : formatDate(expires),
            },
            { label: "Last renewed", value: formatDate(subscription.renewedAt) },
            {
              label: "Allowance",
              value: subscription.annualAllowance ? "Pooled yearly" : "Monthly",
            },
            {
              label: "Billed by",
              value: subscription.gatewayRef ? (
                <CopyButton value={subscription.gatewayRef} className="text-sm" />
              ) : (
                "Set by staff"
              ),
            },
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          This organisation has no subscription row, so no plan limits apply to it.
        </p>
      )}
      {query.isPending ? (
        <Skeleton className="h-20 rounded-lg" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} className="py-6" />
      ) : query.data ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            What the plan allows
            {query.data.contractedCap && " · contracted cap"}
          </p>
          <FeaturesSummary subscription={query.data} />
        </div>
      ) : null}
    </Panel>
  );
}

function ActivitySection({ orgId, onTab }: { orgId: string; onTab: (tab: OrgTab) => void }) {
  const customer = useQuery(orgActivityQueryOptions(orgId, "customer", 1));
  const staff = useQuery(orgActivityQueryOptions(orgId, "staff", 1));
  const entries: (OrgActivityEntry & { byStaff: boolean })[] = [
    ...(customer.data?.data ?? []).map((entry) => ({ ...entry, byStaff: false })),
    ...(staff.data?.data ?? []).map((entry) => ({ ...entry, byStaff: true })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, ACTIVITY_PREVIEW);
  const failed = customer.error ?? staff.error;

  return (
    <Panel className="flex flex-col gap-4">
      <SectionHeading action={<MoreLink onClick={() => onTab("activity")}>Activity</MoreLink>}>
        Recent activity
      </SectionHeading>
      {customer.isPending || staff.isPending ? (
        <Skeleton className="h-28 rounded-lg" />
      ) : failed ? (
        <ErrorState
          error={failed}
          onRetry={() => void Promise.all([customer.refetch(), staff.refetch()])}
          className="py-6"
        />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ol className="-my-1 flex flex-col divide-y">
          {entries.map((entry) => (
            <li key={`${entry.byStaff}-${entry.id}`} className="flex items-start gap-3 py-2.5">
              <span
                aria-hidden
                className={
                  entry.byStaff
                    ? "mt-1.5 size-2 shrink-0 rounded-full bg-chart-5"
                    : "mt-1.5 size-2 shrink-0 rounded-full bg-chart-3"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{entry.action}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.byStaff ? "RateUp staff · " : ""}
                  {entry.actor}
                </p>
              </div>
              <span
                className="shrink-0 text-xs text-muted-foreground"
                title={formatDateTime(entry.createdAt)}
              >
                {formatRelative(entry.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function BusinessSection({ org }: { org: OrgSummary }) {
  return (
    <Panel className="flex flex-col gap-5">
      <SectionHeading>Business</SectionHeading>
      <DetailList
        className="gap-y-3"
        items={[
          { label: "Owner", value: org.owner.name ?? org.owner.email },
          { label: "Owner email", value: org.owner.email },
          { label: "Phone", value: org.phone },
          { label: "Industry", value: org.industry },
          {
            label: "Website",
            value: org.website ? (
              <a
                href={/^https?:\/\//.test(org.website) ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline-offset-4 hover:underline"
              >
                {org.website}
              </a>
            ) : null,
          },
          { label: "Location", value: org.location },
          { label: "Address", value: org.address },
          { label: "Onboarding", value: org.onboardingCompleted ? "Completed" : "Not finished" },
          { label: "WhatsApp templates", value: formatNumber(org.counts.templates) },
          {
            label: "Deletion warning sent",
            value: org.deletionWarningSentAt ? formatDateTime(org.deletionWarningSentAt) : null,
          },
        ]}
      />
    </Panel>
  );
}
