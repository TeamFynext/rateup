import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { subscriptionListQueryOptions, type SubscriptionRow } from "@/api/billing.api";
import { planOptionsQueryOptions } from "@/api/orgs.query";
import { Mono } from "@/components/billing/gateway-cells";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { FilterChips, type FilterChip } from "@/components/ds/filter-chips";
import { PageHeading } from "@/components/ds/page-heading";
import { Pager } from "@/components/ds/pager";
import { PlanPill, SubscriptionPill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { SearchField } from "@/components/ds/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatNumber, isEffectivelyNever } from "@/lib/format";

const PAGE_SIZE = 25;
const ALL_PLANS = "all";

const VIEWS = {
  all: { label: "All", params: {} },
  active: { label: "Active", params: { status: "active" } },
  expired: { label: "Expired", params: { status: "expired" } },
  gateway: { label: "Billed by a gateway", params: { billing: "gateway" } },
  manual: { label: "Granted by hand", params: { billing: "manual" } },
} as const;
type View = keyof typeof VIEWS;
const VIEW_KEYS = Object.keys(VIEWS) as [View, ...View[]];
const VIEW_CHIPS: FilterChip<View>[] = VIEW_KEYS.map((key) => ({
  value: key,
  label: VIEWS[key].label,
}));

const SORTS = {
  expires: { label: "Expiring first", sort: "expires", order: "asc" },
  renewed: { label: "Recently renewed", sort: "renewed", order: "desc" },
  created: { label: "Newest first", sort: "created", order: "desc" },
} as const;
type SortKey = keyof typeof SORTS;
const SORT_KEYS = Object.keys(SORTS) as [SortKey, ...SortKey[]];

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  view: z.enum(VIEW_KEYS).optional().catch(undefined),
  plan: z.string().optional().catch(undefined),
  sort: z.enum(SORT_KEYS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
type SubscriptionSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/billing/subscriptions")({
  validateSearch: searchSchema,
  component: SubscriptionsPage,
});

function expiry(value: string) {
  return isEffectivelyNever(value) ? "Never" : formatDate(value);
}

const COLUMNS: Column<SubscriptionRow>[] = [
  {
    key: "org",
    header: "Organisation",
    primary: true,
    cell: (row) => (
      <span className="flex min-w-0 items-center gap-3">
        <EntityAvatar name={row.orgName} src={row.orgLogo} className="size-9" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{row.orgName}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.ownerEmail}</span>
        </span>
      </span>
    ),
  },
  { key: "plan", header: "Plan", cell: (row) => <PlanPill plan={row.plan} /> },
  {
    key: "status",
    header: "Status",
    cell: (row) => <SubscriptionPill status={row.status} expiresAt={row.expiresAt} />,
  },
  {
    key: "expires",
    header: "Expires",
    cell: (row) => <span className="tabular">{expiry(row.expiresAt)}</span>,
  },
  {
    key: "renewed",
    header: "Renewed",
    hideBelow: "lg",
    cell: (row) => <span className="text-muted-foreground">{formatDate(row.renewedAt)}</span>,
  },
  {
    key: "billing",
    header: "Billing",
    hideBelow: "xl",
    cell: (row) =>
      row.gatewayRef ? (
        <Mono>{row.gatewayRef}</Mono>
      ) : (
        <span className="text-muted-foreground">By hand</span>
      ),
  },
];

function SubscriptionsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const sort = SORTS[search.sort ?? "expires"];
  const plans = useQuery(planOptionsQueryOptions);
  const list = useQuery(
    subscriptionListQueryOptions({
      ...VIEWS[search.view ?? "all"].params,
      q: search.q || undefined,
      planId: search.plan || undefined,
      sort: sort.sort,
      order: sort.order,
      page: search.page ?? 1,
      pageSize: PAGE_SIZE,
    }),
  );
  const update = (patch: Partial<SubscriptionSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page }),
      // Filtering narrows what is already on screen; the Pager handles its own scrolling.
      resetScroll: false,
    });
  const planName = (id: string) =>
    id === ALL_PLANS ? "All plans" : (plans.data?.find((plan) => plan.id === id)?.name ?? "Plan");

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Subscriptions"
        description={
          list.data
            ? `${formatNumber(list.data.total)} matching`
            : "Every organisation's subscription, as billing sees it"
        }
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={search.q ?? ""}
            onCommit={(q) => update({ q: q || undefined })}
            placeholder="Org name or id, owner email, gateway subscription id"
            className="lg:max-w-xl"
          />
          <div className="grid grid-cols-2 gap-3 lg:ml-auto lg:flex">
            <Select
              value={search.plan ?? ALL_PLANS}
              onValueChange={(value) =>
                update({ plan: !value || value === ALL_PLANS ? undefined : value })
              }
            >
              <SelectTrigger className="h-9 w-full rounded-lg px-4 text-[13px] font-medium shadow-none lg:w-44">
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
              value={search.sort ?? "expires"}
              onValueChange={(value) =>
                update({ sort: value === "expires" ? undefined : (value as SortKey) })
              }
            >
              <SelectTrigger className="h-9 w-full rounded-lg px-4 text-[13px] font-medium shadow-none lg:w-48">
                <SelectValue>{(value: SortKey) => SORTS[value]?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORTS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <FilterChips
          chips={VIEW_CHIPS}
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
          title="No subscriptions match"
          description="Try a different search or filter."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ResponsiveTable
            rows={list.data.data}
            columns={COLUMNS}
            rowKey={(row) => row.orgId}
            rowLink={(row) => ({
              to: "/orgs/$orgId",
              params: { orgId: row.orgId },
              search: { tab: "usage" },
            })}
          />
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
