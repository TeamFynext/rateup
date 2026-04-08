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
  TeamChannelPermissions,
} from "@/components/settings/team";
import { Button } from "@/components/ui/button";

function TeamManagement() {
  const router = useRouter();
  const t = useExtracted();
  const [activeTab, setActiveTab] = useState("members");
  const { teamId } = useParams() as { teamId: string };
  const { data: teamsData, isPending } = useGetTeamById(teamId);
  if (isPending) {
    return <TeamSkeleton />;
  }
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("Back to Settings")}
              </Button>

              <div className="border-b border-b-gray-300" />

              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: teamsData?.color }}
                >
                  <Users className="w-6 h-6 text-white" />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold leading-tight">
                    {teamsData?.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {teamsData?.members?.length || 0} {t("members")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-8">
            {[
              { key: "members", label: t("Members") },
              // { key: "permissions", label:t("Permissions") },
              { key: "settings", label: t("Settings") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}

                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === "members" && <AddMembers selectedTeam={teamId} />}

          {/* {activeTab === "permissions" && (
            <TeamChannelPermissions selectedTeam={teamsData} />
          )} */}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <EditTeam selectedTeam={teamsData} />
              <DeleteTeam selectedTeam={teamsData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamManagement;
