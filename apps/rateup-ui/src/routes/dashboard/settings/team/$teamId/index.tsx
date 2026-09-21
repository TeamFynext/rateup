import { IconUsers } from "@tabler/icons-react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetTeamById, useTeamMembersFromInvitation } from "@/backend/team/team.query";
import { BackLink } from "@/components/common/back-link.tsx";
import TeamSkeleton from "@/components/settings/skeleton.tsx";
import {
  AddMembers,
  DeleteTeam,
  EditTeam,
  TeamChannelAccess,
} from "@/components/settings/team.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

export const Route = createFileRoute("/dashboard/settings/team/$teamId/")({
  component: TeamManagement,
});

function TeamManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("members");
  const { teamId } = useParams({
    strict: false,
  });
  const { data: teamsData, isPending } = useGetTeamById(teamId ?? "");
  // `/team/:id` returns the team row with no members relation, so the count comes from the
  // query the Members tab already caches.
  const { data: teamMembersData } = useTeamMembersFromInvitation(teamId ?? "");
  const { can } = usePermissions();
  // Mirrors the API's route declarations: adding and removing people is `teams.manage_members`;
  // channel scope and deleting the team are `teams.manage`.
  const canManage = can("teams.manage_members");
  const canAdminister = can("teams.manage");
  if (isPending) {
    return <TeamSkeleton />;
  }

  const memberCount = teamMembersData?.members?.length ?? 0;
  const pendingInviteCount = teamMembersData?.invitations?.length ?? 0;
  return (
    <div className="h-full relative">
      <div className="mx-auto w-full max-w-265 pt-6">
        <BackLink to="/dashboard/settings/team" label={t("Teams")} className="mb-3" />

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0"
            style={{ backgroundColor: teamsData?.color }}
          >
            <IconUsers className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight truncate">{teamsData?.name}</h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>
                {memberCount} {t("members")}
              </span>

              {pendingInviteCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {pendingInviteCount} {t("invited")}
                  </span>
                </>
              )}

              {teamsData?.code && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{teamsData.code}</span>
                </>
              )}

              {teamsData?.createdAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t("Created on")} {dayjs(teamsData.createdAt).format("MMM D, YYYY")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-265 pt-4 pb-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* A member can look at who is in the team; changing it needs manage rights, and
              channel scope is narrower still. */}
          <TabsList>
            <TabsTrigger value="members">{t("Members")}</TabsTrigger>
            {canAdminister && <TabsTrigger value="channels">{t("Channels")}</TabsTrigger>}
            {canManage && <TabsTrigger value="settings">{t("Details")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="members">
            <AddMembers selectedTeam={teamId ?? ""} canManage={canManage} />
          </TabsContent>

          {canAdminister && (
            <TabsContent value="channels">
              <TeamChannelAccess selectedTeam={teamsData} />
            </TabsContent>
          )}

          {canManage && (
            <TabsContent value="settings">
              <div className="space-y-6">
                <EditTeam selectedTeam={teamsData} />
                {canAdminister && <DeleteTeam selectedTeam={teamsData} />}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
