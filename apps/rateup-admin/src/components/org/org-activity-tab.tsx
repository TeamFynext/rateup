import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { ActivitySource } from "@/api/orgs.api";
import { orgActivityQueryOptions } from "@/api/orgs.query";
import { FilterChips, type FilterChip } from "@/components/ds/filter-chips";
import { Pager } from "@/components/ds/pager";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { formatDateTime, formatRelative } from "@/lib/format";

const SOURCES: FilterChip<ActivitySource>[] = [
  { value: "customer", label: "By the customer" },
  { value: "staff", label: "By RateUp staff" },
];

/** The org's own audit trail, or what RateUp staff did to it, newest first. */
export function OrgActivityTab({ orgId }: { orgId: string }) {
  const [source, setSource] = useState<ActivitySource>("customer");
  const [page, setPage] = useState(1);
  const query = useQuery(orgActivityQueryOptions(orgId, source, page));

  return (
    <div className="flex flex-col gap-6">
      <FilterChips
        chips={SOURCES}
        value={source}
        onChange={(next) => {
          setSource(next);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title="Nothing recorded"
          description={
            source === "staff"
              ? "No one at RateUp has changed this organisation from the console."
              : "The customer's team hasn't done anything that is audited yet."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-3xl border">
            {query.data.data.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.action}</p>
                  {entry.detail && (
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {entry.detail}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground sm:justify-end">
                  <span className="truncate">{entry.actor}</span>
                  <span className="shrink-0" title={formatDateTime(entry.createdAt)}>
                    {formatRelative(entry.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Pager
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            fetching={query.isPlaceholderData}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
