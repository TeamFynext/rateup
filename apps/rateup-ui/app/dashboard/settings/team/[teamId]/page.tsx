"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Users } from "lucide-react";
import { useExtracted } from "next-intl";

import { useGetTeamById } from "@/backend/team/team.query";
import TeamSkeleton from "@/components/settings/skeleton";
import {
  AddMembers,
  DeleteTeam,
  EditTeam,
  TeamFeatureAccess,
} from "@/components/settings/team";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

function TeamManagement() {
  const router = useRouter();
  const t = useExtracted();
  const [activeTab, setActiveTab] = useState("members");
  const { teamId } = useParams() as { teamId: string };
  const { data: teamsData, isPending } = useGetTeamById(teamId);
  const { user } = useUser();
  const isSuperAdmin = user?.role === UserRole.SUPADM;
  if (isPending) {
    return <TeamSkeleton />;
  }
  return (
    <div className="min-h-screen">
      {/* Header */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("Back to Settings")}
            </Button>

            <div className="h-8 w-px bg-border" />

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0"
                style={{ backgroundColor: teamsData?.color }}
              >
                <Users className="w-5 h-5 text-white" />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight truncate">
                  {teamsData?.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {teamsData?.members?.length || 0} {t("members")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="members">{t("Members")}</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="feature-access">
                {t("Feature Access")}
              </TabsTrigger>
            )}
            <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <AddMembers selectedTeam={teamId} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="feature-access">
              <TeamFeatureAccess selectedTeam={teamsData} />
            </TabsContent>
          )}

          <TabsContent value="settings">
            <div className="space-y-6">
              <EditTeam selectedTeam={teamsData} />
              <DeleteTeam selectedTeam={teamsData} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TeamManagement;
