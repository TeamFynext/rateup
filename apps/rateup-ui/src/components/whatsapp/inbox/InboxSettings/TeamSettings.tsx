import { IconExternalLink, IconUsersGroup } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { buttonVariants } from "@/components/ui/button.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

import { SettingsEmpty, SettingsPanel } from "./SettingsPanel.tsx";

/**
 * Who conversations get routed to, as the inbox sees it.
 *
 * Read-only on purpose: creating teams and moving people between them already
 * lives at `/dashboard/settings/team`, and a second editor for the same rows is
 * how the two drift apart. This answers the question an agent actually has in
 * the inbox — which teams exist, and who is on them.
 */
export default function TeamSettings() {
  const { t } = useTranslation();
  const { data: teamRes, isLoading: isTeamLoading } = useTeamsByUser();
  const { data: memberRes, isLoading: isMemberLoading } = useTeamsMembersOfOrg();

  const teams = teamRes?.data ?? [];
  const members = useMemo(() => memberRes?.data ?? [], [memberRes]);

  /** Members grouped by team id — the members endpoint is member-major. */
  const membersByTeam = useMemo(() => {
    const map = new Map<string, TeamMembersData[]>();
    for (const member of members) {
      for (const team of member.teams ?? []) {
        const list = map.get(team.team_id) ?? [];
        list.push(member);
        map.set(team.team_id, list);
      }
    }
    return map;
  }, [members]);

  const isLoading = isTeamLoading || isMemberLoading;

  return (
    <SettingsPanel
      title={t("Teams")}
      description={t("Teams a conversation can be assigned to, and who is on each of them.")}
      action={
        <Link
          to="/dashboard/settings/team"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <IconExternalLink className="size-4" />
          {t("Manage teams")}
        </Link>
      }
      className="max-w-4xl"
    >
      {isLoading && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      )}

      {!isLoading && teams.length === 0 && (
        <SettingsEmpty
          icon={<IconUsersGroup className="size-7" />}
          message={t("No teams yet — create one to route conversations to a group of agents.")}
        />
      )}

      {!isLoading && teams.length > 0 && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {teams.map((team) => {
            const teamMembers = membersByTeam.get(team.id) ?? [];
            // `_count.members` is the server's own tally; the grouped list can be
            // shorter when a member is outside the caller's visibility.
            const memberCount = team._count?.members ?? teamMembers.length;
            return (
              <div key={team.id} className="rounded-xl border border-border bg-card p-4.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    {team.color && (
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: team.color }}
                      />
                    )}
                    <span className="truncate text-sm font-extrabold text-foreground">
                      {team.name}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    {t("{count} members", { count: memberCount })}
                  </span>
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">{t("No members yet.")}</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2.5">
                        <CreativeAvatar
                          name={member.name}
                          size="sm"
                          showOnlineStatus
                          isOnline={member.status === "online"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-foreground">
                            {member.name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SettingsPanel>
  );
}
