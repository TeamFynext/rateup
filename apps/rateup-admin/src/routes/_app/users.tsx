import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { USER_SORTS, userListQueryOptions, type UserRow, type UserSort } from "@/api/users.api";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { FilterChips, type FilterChip } from "@/components/ds/filter-chips";
import { Pager } from "@/components/ds/pager";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { SearchField } from "@/components/ds/search-field";
import { PageHeader } from "@/components/shell/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";

const PAGE_SIZE = 25;

const VIEWS = ["all", "active", "paused", "inactive"] as const;
type UserView = (typeof VIEWS)[number];
const VIEW_CHIPS: FilterChip<UserView>[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Removed" },
];

const SORT_LABELS: Record<UserSort, string> = {
  created: "Newest first",
  lastLogin: "Recently signed in",
  email: "Email A–Z",
};
const SORT_ORDER: Record<UserSort, "asc" | "desc"> = {
  created: "desc",
  lastLogin: "desc",
  email: "asc",
};

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  view: z.enum(VIEWS).optional().catch(undefined),
  sort: z.enum(USER_SORTS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
type UserSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/users")({
  validateSearch: searchSchema,
  component: UsersPage,
});

function UsersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const sort = search.sort ?? "created";
  const list = useQuery(
    userListQueryOptions({
      q: search.q || undefined,
      status: search.view && search.view !== "all" ? search.view : undefined,
      sort,
      order: SORT_ORDER[sort],
      page: search.page ?? 1,
      pageSize: PAGE_SIZE,
    }),
  );

  const update = (patch: Partial<UserSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page }) });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Users"
        description={
          list.data
            ? `${formatNumber(list.data.total)} matching`
            : "Every user across all organisations"
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={search.q ?? ""}
            onCommit={(q) => update({ q: q || undefined })}
            placeholder="Name, email, phone number or user id"
            className="lg:max-w-xl"
          />
          <Select
            value={sort}
            onValueChange={(value) =>
              update({ sort: value === "created" ? undefined : (value as UserSort) })
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl px-4 text-[13px] font-medium shadow-none lg:ml-auto lg:w-52">
              <SelectValue>{(value: UserSort) => SORT_LABELS[value]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {USER_SORTS.map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <EmptyState title="No users match" description="Try a different search or filter." />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-3xl border">
            {list.data.data.map((user) => (
              <UserItem key={user.id} user={user} />
            ))}
          </ul>
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

function UserStatus({ user }: { user: UserRow }) {
  if (!user.active) return <Pill tone="negative">Removed</Pill>;
  if (user.paused) return <Pill tone="warning">Paused</Pill>;
  return null;
}

/**
 * One row that reflows: identity, then the orgs, then dates. Stacked on a phone, a single
 * line from `lg` up.
 */
function UserItem({ user }: { user: UserRow }) {
  const moreOrgs = user.orgCount - user.orgs.length;
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 items-center gap-3 lg:w-80 lg:shrink-0">
        <EntityAvatar name={user.name ?? user.email} src={user.avatarUrl} />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-medium">{user.name ?? user.email}</span>
            <UserStatus user={user} />
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ""}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pl-13 lg:pl-0">
        {user.orgs.length === 0 && (
          <span className="text-xs text-muted-foreground">No organisation</span>
        )}
        {user.orgs.map((org) => (
          <Link
            key={org.id}
            to="/orgs/$orgId"
            params={{ orgId: org.id }}
            className="inline-flex h-7 max-w-56 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors hover:border-foreground/40"
          >
            <span className="truncate">{org.name}</span>
            {org.isOwner && <span className="text-muted-foreground">· owner</span>}
          </Link>
        ))}
        {moreOrgs > 0 && <span className="text-xs text-muted-foreground">+{moreOrgs} more</span>}
      </div>

      <p className="pl-13 text-xs text-muted-foreground lg:w-48 lg:shrink-0 lg:pl-0 lg:text-right">
        {user.lastLoginAt ? `Signed in ${formatRelative(user.lastLoginAt)}` : "Never signed in"}
        <span className="block">Joined {formatDate(user.createdAt)}</span>
      </p>
    </li>
  );
}
