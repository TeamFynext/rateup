import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import type { OrgListParams, OrgRow } from "@/api/orgs.api";
import { orgListQueryOptions, planOptionsQueryOptions } from "@/api/orgs.query";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { FilterChips } from "@/components/ds/filter-chips";
import { Pager } from "@/components/ds/pager";
import { PlanPill, Pill, SubscriptionPill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { SearchField } from "@/components/ds/search-field";
import { UsageBar } from "@/components/ds/usage-meter";
import {
  ORG_SORT_KEYS,
  ORG_SORT_OPTIONS,
  ORG_VIEW_CHIPS,
  ORG_VIEW_KEYS,
  ORG_VIEWS,
} from "@/components/org/org-list-options";
import { PageHeader } from "@/components/shell/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatNumber, formatRelative, isEffectivelyNever } from "@/lib/format";

const PAGE_SIZE = 25;
const ALL_PLANS = "all";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  view: z.enum(ORG_VIEW_KEYS).optional().catch(undefined),
  plan: z.string().optional().catch(undefined),
  sort: z.enum(ORG_SORT_KEYS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
type OrgSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/orgs/")({
  validateSearch: searchSchema,
  component: OrganisationsPage,
});

/** URL state → API parameters. A view's own sort applies unless one was picked. */
function toParams(search: OrgSearch): OrgListParams {
  const view = ORG_VIEWS[search.view ?? "all"].params;
  const sort = search.sort ? ORG_SORT_OPTIONS[search.sort] : undefined;
  return {
    ...view,
    q: search.q || undefined,
    planId: search.plan || undefined,
    ...(sort ? { sort: sort.sort, order: sort.order } : {}),
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  };
}

function OrganisationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const params = toParams(search);
  const list = useQuery(orgListQueryOptions(params));
  const plans = useQuery(planOptionsQueryOptions);

  /** Any filter change goes back to page one. */
  const update = (patch: Partial<OrgSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page }),
      // Filtering narrows what is already on screen; the Pager handles its own scrolling.
      resetScroll: false,
    });

  const planName = (id: string) =>
    id === ALL_PLANS ? "All plans" : (plans.data?.find((plan) => plan.id === id)?.name ?? "Plan");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Organisations"
        description={
          list.data ? `${formatNumber(list.data.total)} matching` : "Every organisation on RateUp"
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={search.q ?? ""}
            onCommit={(q) => update({ q: q || undefined })}
            placeholder="Name, org id, owner or member email, phone number, WABA id"
            className="lg:max-w-xl"
          />
          <div className="grid grid-cols-2 gap-3 lg:ml-auto lg:flex">
            <Select
              value={search.plan ?? ALL_PLANS}
              onValueChange={(value) =>
                update({ plan: !value || value === ALL_PLANS ? undefined : value })
              }
            >
              <SelectTrigger className="h-11 w-full rounded-xl px-4 text-[13px] font-medium shadow-none lg:w-44">
                <SelectValue>{(value: string) => planName(value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PLANS}>All plans</SelectItem>
                {plans.data?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={search.sort ?? "newest"}
              onValueChange={(value) =>
                update({ sort: value === "newest" ? undefined : (value as OrgSearch["sort"]) })
              }
            >
              <SelectTrigger className="h-11 w-full rounded-xl px-4 text-[13px] font-medium shadow-none lg:w-48">
                <SelectValue>
                  {(value: keyof typeof ORG_SORT_OPTIONS) => ORG_SORT_OPTIONS[value]?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ORG_SORT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ORG_SORT_OPTIONS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <FilterChips
          chips={ORG_VIEW_CHIPS}
          value={search.view ?? "all"}
          onChange={(view) => update({ view: view === "all" ? undefined : view })}
        />
      </div>

      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <EmptyState
          title="No organisations match"
          description="Try a different search or clear the filters."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <OrgTable rows={list.data.data} />
          <OrgCards rows={list.data.data} />
          <Pager
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            fetching={list.isPlaceholderData}
            onPageChange={(page) => update({ ...search, page })}
          />
        </div>
      )}
    </div>
  );
}

function ExpiryText({ row }: { row: OrgRow }) {
  if (!row.expiresAt) return <span className="text-muted-foreground">—</span>;
  if (isEffectivelyNever(row.expiresAt))
    return <span className="text-muted-foreground">Never</span>;
  return <span className="tabular">{formatDate(row.expiresAt)}</span>;
}

/** Desktop and tablet: a full table. Rows are links, so they open in a new tab too. */
function OrgTable({ rows }: { rows: OrgRow[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-3xl border md:block">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-3.5 pr-4 pl-6 font-medium">Organisation</th>
            <th className="px-4 py-3.5 font-medium">Plan</th>
            <th className="px-4 py-3.5 font-medium">Status</th>
            <th className="px-4 py-3.5 font-medium">Conversations</th>
            <th className="hidden px-4 py-3.5 font-medium lg:table-cell">Expires</th>
            <th className="px-4 py-3.5 font-medium">Last active</th>
            <th className="hidden py-3.5 pr-6 pl-4 font-medium xl:table-cell">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="group relative transition-colors hover:bg-muted/50">
              <td className="py-3.5 pr-4 pl-6">
                <Link
                  to="/orgs/$orgId"
                  params={{ orgId: row.id }}
                  className="flex items-center gap-3 after:absolute after:inset-0"
                >
                  <EntityAvatar name={row.name} src={row.logo} className="size-9" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{row.name}</span>
                      {row.suspendedAt && <Pill tone="negative">Suspended</Pill>}
                      {row.pausedByCustomer && <Pill tone="warning">Paused</Pill>}
                    </span>
                    <span className="block max-w-64 truncate text-xs text-muted-foreground">
                      {row.owner.email}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3.5">
                <PlanPill plan={row.plan} />
              </td>
              <td className="px-4 py-3.5">
                <SubscriptionPill status={row.status} expiresAt={row.expiresAt} />
              </td>
              <td className="px-4 py-3.5">
                <UsageBar used={row.conversations.used} max={row.conversations.max} />
              </td>
              <td className="hidden px-4 py-3.5 lg:table-cell">
                <ExpiryText row={row} />
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                {row.lastActiveAt ? formatRelative(row.lastActiveAt) : "Never"}
              </td>
              <td className="hidden py-3.5 pr-6 pl-4 text-muted-foreground tabular xl:table-cell">
                {formatDate(row.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phones: one card per org, the same facts stacked. */
function OrgCards({ rows }: { rows: OrgRow[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            to="/orgs/$orgId"
            params={{ orgId: row.id }}
            className="flex flex-col gap-4 rounded-3xl border p-5 transition-colors active:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <EntityAvatar name={row.name} src={row.logo} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.owner.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PlanPill plan={row.plan} />
              <SubscriptionPill status={row.status} expiresAt={row.expiresAt} />
              {row.suspendedAt && <Pill tone="negative">Suspended</Pill>}
              {row.pausedByCustomer && <Pill tone="warning">Paused</Pill>}
            </div>
            <UsageBar
              used={row.conversations.used}
              max={row.conversations.max}
              unit="conversations"
            />
            <p className="text-xs text-muted-foreground">
              Active {row.lastActiveAt ? formatRelative(row.lastActiveAt) : "never"} · Created{" "}
              {formatDate(row.createdAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
