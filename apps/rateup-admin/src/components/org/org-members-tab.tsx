import { IconDots, IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { OrgMember } from "@/api/orgs.api";
import { orgMembersQueryOptions } from "@/api/orgs.query";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { FilterChips } from "@/components/ds/filter-chips";
import { SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, PanelSkeleton } from "@/components/ds/query-states";
import { MemberPauseDialog } from "@/components/org/member-pause-dialog";
import { groupByRole, ROLE_SUMMARIES } from "@/components/org/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatRelative } from "@/lib/format";

function MemberStatus({ member }: { member: OrgMember }) {
  if (!member.user.active) return <Pill tone="negative">Removed</Pill>;
  if (member.user.paused) return <Pill tone="warning">Paused</Pill>;
  return null;
}

/** One person: who they are, their role and teams, when they last signed in. */
export function MemberRow({
  member,
  onPause,
}: {
  member: OrgMember;
  /** Adds the row menu; left out where the list is only a preview. */
  onPause?: (member: OrgMember) => void;
}) {
  const name = member.user.name ?? member.user.email;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <EntityAvatar name={name} src={member.user.avatarUrl} className="size-9" />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <MemberStatus member={member} />
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {member.user.email}
            {member.user.phone ? ` · ${member.user.phone}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-12 sm:pl-0">
        <Pill tone={member.isOwner ? "brand" : "muted"}>{member.role}</Pill>
        {member.teams.map((team) => (
          <Pill key={team.id} tone="outline">
            {team.name}
          </Pill>
        ))}
      </div>
      <p className="pl-12 text-xs text-muted-foreground sm:w-36 sm:pl-0 sm:text-right">
        {member.user.lastLoginAt
          ? `Signed in ${formatRelative(member.user.lastLoginAt)}`
          : "Never signed in"}
      </p>
      {onPause && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${name}`}
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:static"
          >
            <IconDots className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onClick={() => onPause(member)} disabled={!member.user.active}>
              {member.user.paused ? <IconPlayerPlay /> : <IconPlayerPause />}
              {member.user.paused ? "Resume sign-in" : "Pause sign-in"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

const ALL = "all";

export function OrgMembersTab({ orgId }: { orgId: string }) {
  const query = useQuery(orgMembersQueryOptions(orgId));
  const [role, setRole] = useState<string>(ALL);
  const [pausing, setPausing] = useState<OrgMember | null>(null);

  if (query.isPending) return <PanelSkeleton panels={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { members, teams, invitations } = query.data;
  const groups = groupByRole(members);
  const shown = role === ALL ? groups : groups.filter((group) => group.key === role);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <SectionHeading>Members · {members.length}</SectionHeading>
        {members.length === 0 ? (
          <EmptyState title="No members" />
        ) : (
          <>
            {groups.length > 1 && (
              <FilterChips
                chips={[
                  { value: ALL, label: `All ${members.length}` },
                  ...groups.map((group) => ({
                    value: group.key,
                    label: `${group.label} ${group.members.length}`,
                  })),
                ]}
                value={role}
                onChange={setRole}
              />
            )}
            {shown.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2 px-1">
                  <h3 className="text-sm font-semibold">{group.label}</h3>
                  <span className="text-xs text-muted-foreground">{ROLE_SUMMARIES[group.key]}</span>
                </div>
                <ul className="flex flex-col divide-y rounded-xl bg-card shadow-xs ring-1 ring-foreground/10 [&>li]:relative">
                  {group.members.map((member) => (
                    <MemberRow key={member.id} member={member} onPause={setPausing} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel className="flex flex-col gap-4">
          <SectionHeading>Teams · {teams.length}</SectionHeading>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams.</p>
          ) : (
            <ul className="-my-1 flex flex-col divide-y">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Code {team.code} · created {formatDate(team.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm tabular text-muted-foreground">
                    {team.members} {team.members === 1 ? "member" : "members"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="flex flex-col gap-4">
          <SectionHeading>Pending invitations · {invitations.length}</SectionHeading>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <ul className="-my-1 flex flex-col divide-y">
              {invitations.map((invite) => (
                <li key={invite.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{invite.name || invite.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invite.email} · sent {formatRelative(invite.createdAt)} by {invite.invitedBy}
                    </p>
                  </div>
                  {invite.role && <Pill>{invite.role.replace("_", " ").toLowerCase()}</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {pausing && <MemberPauseDialog user={pausing.user} onClose={() => setPausing(null)} />}
    </div>
  );
}
