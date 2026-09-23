import { IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
  auditActionsQueryOptions,
  auditQueryOptions,
  staffMembersQueryOptions,
  type AuditEntry,
} from "@/api/access.api";
import { JsonBlock } from "@/components/ds/json-block";
import { Pager } from "@/components/ds/pager";
import { Pill, type PillTone } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { SearchField } from "@/components/ds/search-field";
import { PageHeader } from "@/components/shell/page-header";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";

const PAGE_SIZE = 25;
const ALL = "all";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  action: z.string().optional().catch(undefined),
  staff: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
type AuditSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/audit")({
  validateSearch: searchSchema,
  component: AuditPage,
});

function actionTone(action: string): PillTone {
  if (action.endsWith("login_denied")) return "negative";
  if (action.startsWith("staff.")) return "muted";
  if (/delete|suspend|apply/i.test(action)) return "warning";
  return "outline";
}

function AuditPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const actions = useQuery(auditActionsQueryOptions);
  const staff = useQuery(staffMembersQueryOptions);
  const list = useQuery(
    auditQueryOptions({
      q: search.q || undefined,
      action: search.action || undefined,
      staffUserId: search.staff || undefined,
      page: search.page ?? 1,
      pageSize: PAGE_SIZE,
    }),
  );
  const update = (patch: Partial<AuditSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page }),
      // Filtering narrows what is already on screen; the Pager handles its own scrolling.
      resetScroll: false,
    });
  const staffLabel = (id: string) =>
    id === ALL ? "All staff" : (staff.data?.find((member) => member.id === id)?.email ?? "Staff");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Audit log"
        description={
          list.data
            ? `${formatNumber(list.data.total)} entries`
            : "Every sign-in and every change made from RateUp Admin"
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField
          value={search.q ?? ""}
          onCommit={(q) => update({ q: q || undefined })}
          placeholder="Staff email, action, org name or id, reason"
          className="lg:max-w-xl"
        />
        <div className="grid grid-cols-2 gap-3 lg:ml-auto lg:flex">
          <Select
            value={search.action ?? ALL}
            onValueChange={(value) =>
              update({ action: !value || value === ALL ? undefined : value })
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl px-4 text-[13px] font-medium shadow-none lg:w-52">
              <SelectValue>
                {(value: string) => (value === ALL ? "All actions" : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All actions</SelectItem>
              {actions.data?.map((row) => (
                <SelectItem key={row.action} value={row.action}>
                  {row.action} · {formatNumber(row.count)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.staff ?? ALL}
            onValueChange={(value) =>
              update({ staff: !value || value === ALL ? undefined : value })
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl px-4 text-[13px] font-medium shadow-none lg:w-56">
              <SelectValue>{(value: string) => staffLabel(value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All staff</SelectItem>
              {staff.data?.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <EmptyState title="Nothing logged yet" description="Try a different search or filter." />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-3xl border">
            {list.data.data.map((entry) => (
              <AuditItem key={entry.id} entry={entry} />
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

/** One entry: who did what to which org, with the recorded detail folded away. */
function AuditItem({ entry }: { entry: AuditEntry }) {
  const hasDetail = Boolean(entry.before || entry.after || entry.body || entry.userAgent);
  return (
    <li className="px-5 py-4 sm:px-6">
      <Collapsible>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Pill tone={actionTone(entry.action)} className="font-mono">
              {entry.action}
            </Pill>
            {entry.targetOrgId && (
              <Link
                to="/orgs/$orgId"
                params={{ orgId: entry.targetOrgId }}
                className="truncate text-sm font-medium hover:underline"
              >
                {entry.targetOrgName ?? "Organisation"}
              </Link>
            )}
            {entry.reason && (
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                “{entry.reason}”
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground sm:justify-end">
            <span className="truncate">{entry.staffEmail}</span>
            <span className="shrink-0" title={formatDateTime(entry.createdAt)}>
              {formatRelative(entry.createdAt)}
            </span>
            {hasDetail && (
              <CollapsibleTrigger
                className="group flex shrink-0 items-center gap-1 font-medium tracking-wide uppercase hover:text-foreground"
                aria-label="Show details"
              >
                Details
                <IconChevronDown className="size-3.5 transition-transform group-data-panel-open:rotate-180" />
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        <CollapsibleContent className="flex flex-col gap-3 pt-4">
          <p className="text-xs text-muted-foreground">
            {entry.method} {entry.route} · {formatDateTime(entry.createdAt)}
            {entry.ip ? ` · ${entry.ip}` : ""}
          </p>
          {entry.userAgent && (
            <p className="text-xs break-all text-muted-foreground">{entry.userAgent}</p>
          )}
          {entry.before != null && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Before</p>
              <JsonBlock value={entry.before} />
            </div>
          )}
          {entry.after != null && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">After</p>
              <JsonBlock value={entry.after} />
            </div>
          )}
          {entry.body != null && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Request</p>
              <JsonBlock value={entry.body} />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
