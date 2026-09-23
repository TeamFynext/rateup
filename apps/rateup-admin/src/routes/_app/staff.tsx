import { IconDotsVertical, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { staffMembersQueryOptions, type StaffMember } from "@/api/access.api";
import type { StaffUser } from "@/api/auth.api";
import { useStaff } from "@/api/auth.query";
import { StaffDialogs, type StaffAction } from "@/components/access/staff-dialogs";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable, type Column } from "@/components/ds/responsive-table";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function columns(me: StaffUser, onAction: (action: StaffAction) => void): Column<StaffMember>[] {
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
              {member.id === me.id && <span className="text-xs text-muted-foreground">(you)</span>}
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
      key: "actions",
      header: "",
      align: "right",
      cell: (member) => (
        <span className="flex items-center justify-end gap-1">
          <Link
            to="/audit"
            search={{ staff: member.id }}
            className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
          >
            View log
          </Link>
          <MemberMenu member={member} me={me} onAction={onAction} />
        </span>
      ),
    },
  ];
}

/**
 * What can be done to one row. Owners manage everyone but themselves (another owner does
 * that, so the console can never be left without one); everyone can sign themselves out
 * everywhere.
 */
function MemberMenu({
  member,
  me,
  onAction,
}: {
  member: StaffMember;
  me: StaffUser;
  onAction: (action: StaffAction) => void;
}) {
  const self = member.id === me.id;
  const manages = me.isOwner && !self && member.active;
  if (!manages && !self) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${member.name ?? member.email}`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <IconDotsVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48 p-1.5">
        {manages && (
          <DropdownMenuItem onClick={() => onAction({ kind: "role", member })}>
            {member.isOwner ? "Remove as owner" : "Make owner"}
          </DropdownMenuItem>
        )}
        {(self || member.openSessions > 0) && (
          <DropdownMenuItem onClick={() => onAction({ kind: "sign-out", member })}>
            Sign out everywhere
          </DropdownMenuItem>
        )}
        {manages && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-negative data-highlighted:text-negative"
              onClick={() => onAction({ kind: "deactivate", member })}
            >
              Deactivate
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StaffMembersPage() {
  const me = useStaff();
  const query = useQuery(staffMembersQueryOptions);
  const [action, setAction] = useState<StaffAction | null>(null);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Staff members"
        description={
          me.isOwner
            ? "Who can sign in to RateUp Admin. Only owners change this list."
            : "Who can sign in to RateUp Admin. Ask an owner to add or remove someone."
        }
        actions={
          me.isOwner && (
            <Button className="h-11 rounded-xl px-4" onClick={() => setAction({ kind: "add" })}>
              <IconPlus />
              Add staff member
            </Button>
          )
        }
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
          columns={columns(me, setAction)}
          rowKey={(member) => member.id}
        />
      )}
      <StaffDialogs action={action} onClose={() => setAction(null)} meId={me.id} />
    </div>
  );
}
