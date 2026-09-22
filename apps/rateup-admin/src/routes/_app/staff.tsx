import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { staffMembersQueryOptions, type StaffMember } from "@/api/access.api";
import { useStaff } from "@/api/auth.query";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { PageHeader } from "@/components/shell/page-header";
import { formatDate, formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_app/staff")({
  component: StaffMembersPage,
});

function MemberStatus({ member }: { member: StaffMember }) {
  if (!member.active) return <Pill tone="negative">Deactivated</Pill>;
  if (member.openSessions > 0) return <Pill tone="positive">Signed in</Pill>;
  if (!member.linkedToGoogle) return <Pill tone="warning">Never signed in</Pill>;
  return <Pill>Signed out</Pill>;
}

function columns(meId: string): Column<StaffMember>[] {
  return [
    {
      key: "member",
      header: "Staff member",
      primary: true,
      cell: (member) => (
        <span className="flex min-w-0 items-center gap-3">
          <EntityAvatar
            name={member.name ?? member.email}
            src={member.avatarUrl}
            className="size-9"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{member.name ?? member.email}</span>
              {member.id === meId && <span className="text-xs text-muted-foreground">(you)</span>}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{member.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => (
        <Pill tone={member.isOwner ? "ink" : "muted"}>{member.isOwner ? "Owner" : "Staff"}</Pill>
      ),
    },
    { key: "status", header: "Status", cell: (member) => <MemberStatus member={member} /> },
    {
      key: "login",
      header: "Last sign-in",
      cell: (member) => (
        <span className="text-muted-foreground">
          {member.lastLoginAt ? formatRelative(member.lastLoginAt) : "Never"}
        </span>
      ),
    },
    {
      key: "added",
      header: "Added",
      hideBelow: "lg",
      cell: (member) => (
        <span className="text-muted-foreground">
          {formatDate(member.createdAt)}
          {member.addedBy && <span className="block text-xs">by {member.addedBy}</span>}
        </span>
      ),
    },
    {
      key: "audit",
      header: "Activity",
      align: "right",
      cell: (member) => (
        <Link
          to="/audit"
          search={{ staff: member.id }}
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
        >
          View log
        </Link>
      ),
    },
  ];
}

function StaffMembersPage() {
  const me = useStaff();
  const query = useQuery(staffMembersQueryOptions);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Staff members"
        description="Who can sign in to RateUp Admin. Adding and removing people arrives with the actions phase."
      />
      {query.isPending ? (
        <ListSkeleton rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No staff members" />
      ) : (
        <ResponsiveTable
          rows={query.data}
          columns={columns(me.id)}
          rowKey={(member) => member.id}
        />
      )}
    </div>
  );
}
