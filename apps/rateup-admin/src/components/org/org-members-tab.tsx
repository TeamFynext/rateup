import { useQuery } from "@tanstack/react-query";

import type { OrgMember } from "@/api/orgs.api";
import { orgMembersQueryOptions } from "@/api/orgs.query";
import { EntityAvatar } from "@/components/ds/entity-avatar";
import { SectionTitle } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { formatDate, formatRelative } from "@/lib/format";

function MemberStatus({ member }: { member: OrgMember }) {
  if (!member.user.active) return <Pill tone="negative">Removed</Pill>;
  if (member.user.paused) return <Pill tone="warning">Paused</Pill>;
  return null;
}

export function OrgMembersTab({ orgId }: { orgId: string }) {
  const query = useQuery(orgMembersQueryOptions(orgId));

  if (query.isPending) return <ListSkeleton rows={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const { members, teams, invitations } = query.data;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <SectionTitle>Members · {members.length}</SectionTitle>
        {members.length === 0 ? (
          <EmptyState title="No members" />
        ) : (
          <ul className="flex flex-col divide-y rounded-3xl border">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <EntityAvatar
                    name={member.user.name ?? member.user.email}
                    src={member.user.avatarUrl}
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {member.user.name ?? member.user.email}
                      </span>
                      <MemberStatus member={member} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.user.email}
                      {member.user.phone ? ` · ${member.user.phone}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-13 sm:pl-0">
                  <Pill tone={member.isOwner ? "ink" : "muted"}>{member.role}</Pill>
                  {member.teams.map((team) => (
                    <Pill key={team.id} tone="outline">
                      {team.name}
                    </Pill>
                  ))}
                </div>
                <p className="pl-13 text-xs text-muted-foreground sm:w-40 sm:pl-0 sm:text-right">
                  {member.user.lastLoginAt
                    ? `Signed in ${formatRelative(member.user.lastLoginAt)}`
                    : "Never signed in"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
        <section className="flex flex-col gap-5">
          <SectionTitle>Teams · {teams.length}</SectionTitle>
          {teams.length === 0 ? (
            <EmptyState title="No teams" />
          ) : (
            <ul className="flex flex-col divide-y rounded-3xl border">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{team.name}</p>
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
        </section>

        <section className="flex flex-col gap-5">
          <SectionTitle>Pending invitations · {invitations.length}</SectionTitle>
          {invitations.length === 0 ? (
            <EmptyState title="No pending invitations" />
          ) : (
            <ul className="flex flex-col divide-y rounded-3xl border">
              {invitations.map((invite) => (
                <li key={invite.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{invite.name || invite.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invite.email} · sent {formatRelative(invite.createdAt)}
                    </p>
                  </div>
                  {invite.role && <Pill>{invite.role.replace("_", " ").toLowerCase()}</Pill>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
