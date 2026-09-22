import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { referralsQueryOptions, type Referral } from "@/api/ops.api";
import { CopyButton } from "@/components/ds/copy-button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { StatCard } from "@/components/ds/stat-card";
import { PageHeader } from "@/components/shell/page-header";
import { formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_app/ops/referrals")({
  component: ReferralsPage,
});

const COLUMNS: Column<Referral>[] = [
  {
    key: "partner",
    header: "Partner",
    primary: true,
    cell: (referral) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{referral.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{referral.email}</span>
      </span>
    ),
  },
  {
    key: "code",
    header: "Code",
    cell: (referral) => (
      <CopyButton
        value={referral.link ?? referral.code}
        label={referral.code}
        className="text-sm"
      />
    ),
  },
  {
    key: "visits",
    header: "Visits",
    align: "right",
    cell: (referral) => <span className="tabular">{formatNumber(referral.visits)}</span>,
  },
  {
    key: "signups",
    header: "Signups",
    align: "right",
    cell: (referral) => (
      <span className="font-medium tabular">{formatNumber(referral.signups)}</span>
    ),
  },
  {
    key: "conversion",
    header: "Conversion",
    align: "right",
    cell: (referral) => (
      <span className="text-muted-foreground tabular">
        {referral.visits ? `${Math.round((referral.signups / referral.visits) * 100)}%` : "—"}
      </span>
    ),
  },
  {
    key: "created",
    header: "Added",
    hideBelow: "lg",
    cell: (referral) => (
      <span className="text-muted-foreground">{formatDate(referral.createdAt)}</span>
    ),
  },
];

function ReferralsPage() {
  const query = useQuery(referralsQueryOptions);
  const totals = (query.data ?? []).reduce(
    (sum, referral) => ({
      visits: sum.visits + referral.visits,
      signups: sum.signups + referral.signups,
    }),
    { visits: 0, signups: 0 },
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Referrals"
        description="Referral partners, their links and what they brought in. Copying a code copies its link."
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No referral partners yet" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
            <StatCard tone="peach" value={formatNumber(query.data.length)} label="Partners" />
            <StatCard tone="sky" value={formatNumber(totals.visits)} label="Visits" />
            <StatCard
              tone="mint"
              value={formatNumber(totals.signups)}
              label="Signups"
              className="col-span-2 lg:col-span-1"
            />
          </div>
          <ResponsiveTable rows={query.data} columns={COLUMNS} rowKey={(referral) => referral.id} />
        </>
      )}
    </div>
  );
}
