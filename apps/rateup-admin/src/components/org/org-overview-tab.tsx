import type { OrgSummary } from "@/api/orgs.api";
import { CopyButton } from "@/components/ds/copy-button";
import { DetailList } from "@/components/ds/detail-list";
import { Panel, SectionTitle } from "@/components/ds/panel";
import { StatCard } from "@/components/ds/stat-card";
import type { OrgAction } from "@/components/org/actions/org-action-dialogs";
import { OrgNotesPanel } from "@/components/org/org-notes-panel";
import { formatDate, formatDateTime, formatNumber, isEffectivelyNever } from "@/lib/format";

export function OrgOverviewTab({
  org,
  onAction,
}: {
  org: OrgSummary;
  onAction: (action: OrgAction) => void;
}) {
  const subscription = org.subscription;
  const expires = subscription?.expiresAt;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        <StatCard tone="peach" value={formatNumber(org.counts.members)} label="Members" />
        <StatCard tone="mint" value={formatNumber(org.counts.teams)} label="Teams" />
        <StatCard tone="sky" value={formatNumber(org.counts.channels)} label="Channels" />
        <StatCard
          tone="slate"
          value={formatNumber(org.counts.pendingInvites)}
          label="Pending invites"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel className="flex flex-col gap-6">
          <SectionTitle>Subscription</SectionTitle>
          {subscription ? (
            <DetailList
              items={[
                { label: "Plan", value: org.plan?.name },
                {
                  label: "Expires",
                  value: expires && isEffectivelyNever(expires) ? "Never" : formatDate(expires),
                },
                { label: "Started", value: formatDate(subscription.startedAt) },
                { label: "Last renewed", value: formatDate(subscription.renewedAt) },
                {
                  label: "Conversation allowance",
                  value: subscription.annualAllowance ? "Pooled yearly" : "Monthly",
                },
                {
                  label: "Gateway subscription",
                  value: subscription.gatewayRef ? (
                    <CopyButton value={subscription.gatewayRef} className="text-sm" />
                  ) : null,
                },
                {
                  label: "Limit alert last sent",
                  value: formatDateTime(subscription.limitAlertSentAt),
                },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This organisation has no subscription row, so no plan limits apply to it.
            </p>
          )}
        </Panel>

        <Panel className="flex flex-col gap-6">
          <SectionTitle>Business</SectionTitle>
          <DetailList
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
                    className="underline-offset-4 hover:underline"
                  >
                    {org.website}
                  </a>
                ) : null,
              },
              { label: "Location", value: org.location },
              { label: "Address", value: org.address },
              {
                label: "Onboarding",
                value: org.onboardingCompleted ? "Completed" : "Not finished",
              },
              { label: "WhatsApp templates", value: formatNumber(org.counts.templates) },
              {
                label: "Deletion warning sent",
                value: org.deletionWarningSentAt ? formatDateTime(org.deletionWarningSentAt) : null,
              },
            ]}
          />
        </Panel>

        <OrgNotesPanel orgId={org.id} onAction={onAction} className="xl:col-span-2" />
      </div>
    </div>
  );
}
