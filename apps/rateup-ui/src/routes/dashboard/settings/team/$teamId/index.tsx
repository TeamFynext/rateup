import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetTeamById, useTeamMembersFromInvitation } from "@/backend/team/team.query";
import TeamSkeleton from "@/components/settings/skeleton.tsx";
import {
  AddMembers,
  DeleteTeam,
  EditTeam,
  TeamChannelAccess,
  TeamFeatureAccess,
} from "@/components/settings/team.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/dashboard/settings/team/$teamId/")({
  component: TeamManagement,
});

function TeamManagement() {
  const { history } = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("members");
  const { teamId } = useParams({
    strict: false,
  });
  const { data: teamsData, isPending } = useGetTeamById(teamId ?? "");
  // `/team/:id` returns the team row with no members relation, so the count comes from the
  // query the Members tab already caches.
  const { data: teamMembersData } = useTeamMembersFromInvitation(teamId ?? "");
  const { user } = useUser();
  // Mirrors TEAM_MANAGER_ROLES in rateup-api's team routes: the owner and org admins manage
  // a team; a plain member only reads the roster.
  const canManage = user?.role === UserRole.SUPADM || user?.role === UserRole.ADM;
  // Feature access and deleting a team stay with the owner — both decide what a whole team
  // can reach, and the routes behind them are SUPER_ADMIN-only.
  const isSuperAdmin = user?.role === UserRole.SUPADM;
  if (isPending) {
    return <TeamSkeleton />;
  }

  const memberCount = teamMembersData?.members?.length ?? 0;
  const pendingInviteCount = teamMembersData?.invitations?.length ?? 0;
  return (
    <div className="h-full relative">
      <div className="mx-auto w-full max-w-265 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => history.back()}
          className="-ml-2 mb-3 text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          {t("Back to Teams")}
        </Button>

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
              feature access is narrower still. */}
          <TabsList>
            <TabsTrigger value="members">{t("Members")}</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="feature-access">{t("Feature Access")}</TabsTrigger>
            )}
            {canManage && <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="members">
            <AddMembers selectedTeam={teamId ?? ""} canManage={canManage} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="feature-access">
              <div className="space-y-6">
                <TeamFeatureAccess selectedTeam={teamsData} />
                <TeamChannelAccess selectedTeam={teamsData} />
              </div>
            </TabsContent>
          )}

          {canManage && (
            <TabsContent value="settings">
              <div className="space-y-6">
                <EditTeam selectedTeam={teamsData} />
                {isSuperAdmin && <DeleteTeam selectedTeam={teamsData} />}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
