import { IconArrowsSort, IconCheck } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useMatch, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, type KeyboardEvent } from "react";

import type { OrgListParams, OrgRow } from "@/api/orgs.api";
import { orgDirectoryQueryOptions, planOptionsQueryOptions } from "@/api/orgs.query";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { PlanPill } from "@/components/ds/pill";
import { ErrorState } from "@/components/ds/query-states";
import { SearchField } from "@/components/ds/search-field";
import {
  ORG_SORT_KEYS,
  ORG_SORT_OPTIONS,
  ORG_VIEW_KEYS,
  ORG_VIEWS,
  type OrgDirectorySearch,
} from "@/components/org/org-list-options";
import type { OrgTab } from "@/components/org/org-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;
const ALL_PLANS = "all";

/** URL state → API parameters. A view's own sort applies unless one was picked. */
function toParams(search: OrgDirectorySearch): Omit<OrgListParams, "page"> {
  const view = ORG_VIEWS[search.view ?? "all"].params;
  const sort = search.sort ? ORG_SORT_OPTIONS[search.sort] : undefined;
  return {
    ...view,
    q: search.q || undefined,
    planId: search.plan || undefined,
    ...(sort ? { sort: sort.sort, order: sort.order } : {}),
    pageSize: PAGE_SIZE,
  };
}

/**
 * The organisation list that lives in the nav panel (and fills the page on phones). Filters
 * are URL state on `/orgs`, so they hold while moving between organisations.
 */
export function OrgDirectory({ className }: { className?: string }) {
  const search = useSearch({ from: "/_app/orgs" });
  const activeId = useParams({ strict: false }).orgId;
  // The open org's tab rides along, so comparing orgs keeps you on e.g. Members.
  const tab = useMatch({
    from: "/_app/orgs/$orgId",
    shouldThrow: false,
    select: (match) => match.search.tab,
  });
  const navigate = useNavigate();
  const list = useInfiniteQuery(orgDirectoryQueryOptions(toParams(search)));
  const plans = useQuery(planOptionsQueryOptions);

  const update = (patch: Partial<OrgDirectorySearch>) => {
    const next = { ...search, ...patch };
    void (activeId
      ? navigate({
          to: "/orgs/$orgId",
          params: { orgId: activeId },
          search: { ...next, tab },
          replace: true,
          resetScroll: false,
        })
      : navigate({ to: "/orgs", search: next, replace: true, resetScroll: false }));
  };

  const rows = list.data?.pages.flatMap((page) => page.data) ?? [];
  const total = list.data?.pages[0]?.total;

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const planName = (id: string) =>
    id === ALL_PLANS ? "All plans" : (plans.data?.find((plan) => plan.id === id)?.name ?? "Plan");

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex flex-col gap-2 border-b p-3">
        <SearchField
          value={search.q ?? ""}
          onCommit={(q) => update({ q: q || undefined })}
          placeholder="Name, email, phone, WABA id"
          className="h-9 rounded-lg"
        />
        <div className="flex items-center gap-2">
          <Select
            value={search.view ?? "all"}
            onValueChange={(value) =>
              update({
                view: !value || value === "all" ? undefined : (value as OrgDirectorySearch["view"]),
              })
            }
          >
            <SelectTrigger
              size="sm"
              className="min-w-0 flex-1 text-xs shadow-none"
              aria-label="View"
            >
              <SelectValue>
                {(value: keyof typeof ORG_VIEWS) => ORG_VIEWS[value]?.label ?? "All"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ORG_VIEW_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {ORG_VIEWS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.plan ?? ALL_PLANS}
            onValueChange={(value) =>
              update({ plan: !value || value === ALL_PLANS ? undefined : value })
            }
          >
            <SelectTrigger
              size="sm"
              className="min-w-0 flex-1 text-xs shadow-none"
              aria-label="Plan"
            >
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
          <SortMenu
            value={search.sort}
            onChange={(sort) => update({ sort: sort === "newest" ? undefined : sort })}
          />
        </div>
        <p className="px-0.5 text-xs text-muted-foreground" aria-live="polite">
          {total === undefined
            ? " "
            : `${formatNumber(total)} ${total === 1 ? "organisation" : "organisations"}`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.isPending ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 10 }, (_, index) => (
              <Skeleton key={index} className="h-13 w-full rounded-lg" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} className="m-3 py-8" />
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No organisations match.
          </p>
        ) : (
          <ul
            className={cn("flex flex-col gap-0.5 p-2", list.isPlaceholderData && "opacity-60")}
            onKeyDown={moveFocus}
          >
            {rows.map((row) => (
              <li key={row.id}>
                <DirectoryRow row={row} active={row.id === activeId} search={{ ...search, tab }} />
              </li>
            ))}
          </ul>
        )}
        <div ref={sentinel} className="h-px" />
        {isFetchingNextPage && (
          <div className="px-2 pb-2">
            <Skeleton className="h-13 w-full rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Arrow keys walk the list, so a staff member can skim orgs without the mouse. */
function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>("a"));
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  const next = links[index + (event.key === "ArrowDown" ? 1 : -1)];
  if (next) {
    event.preventDefault();
    next.focus();
  }
}

function statusOf(row: OrgRow): { label: string; dot: string } | null {
  if (row.suspendedAt) return { label: "Suspended", dot: "bg-destructive" };
  if (row.pausedByCustomer) return { label: "Paused by customer", dot: "bg-chart-5" };
  if (row.status === "expired") return { label: "Expired", dot: "bg-muted-foreground/50" };
  if (row.status === "active" && row.plan?.paid) return { label: "Paid", dot: "bg-positive" };
  return null;
}

function DirectoryRow({
  row,
  active,
  search,
}: {
  row: OrgRow;
  active: boolean;
  search: OrgDirectorySearch & { tab?: OrgTab };
}) {
  const status = statusOf(row);
  return (
    <Link
      to="/orgs/$orgId"
      params={{ orgId: row.id }}
      search={search}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-foreground hover:bg-muted",
      )}
    >
      <span className="relative shrink-0">
        <EntityAvatar
          name={row.name}
          src={row.logo}
          className="size-9 rounded-lg after:rounded-lg *:data-[slot=avatar-fallback]:rounded-lg *:data-[slot=avatar-image]:rounded-lg"
        />
        {status && (
          <span
            title={status.label}
            className={cn(
              "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-sidebar",
              status.dot,
            )}
          >
            <span className="sr-only">{status.label}</span>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", active ? "font-semibold" : "font-medium")}>
          {row.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{row.owner.email}</span>
      </span>
      {row.plan?.paid && <PlanPill plan={row.plan} />}
    </Link>
  );
}

function SortMenu({
  value,
  onChange,
}: {
  value: OrgDirectorySearch["sort"];
  onChange: (value: (typeof ORG_SORT_KEYS)[number]) => void;
}) {
  const current = value ?? "newest";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Sort: ${ORG_SORT_OPTIONS[current].label}`}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          value && "border-primary/30 bg-accent text-accent-foreground",
        )}
      >
        <IconArrowsSort className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {ORG_SORT_KEYS.map((key) => (
            <DropdownMenuItem key={key} onClick={() => onChange(key)}>
              <IconCheck className={cn(key === current ? "opacity-100" : "opacity-0")} />
              {ORG_SORT_OPTIONS[key].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
