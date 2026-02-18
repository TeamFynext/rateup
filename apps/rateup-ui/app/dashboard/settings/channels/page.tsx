"use client";

import React from "react";

import { AlertCircle, Info, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTeamsByUser } from "@/backend/team/team.query";
import {
  useUpdateWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";

const ChannelRow = ({ channel, teamOptions, translations: t }: any) => {
  const updateMutation = useUpdateWaSettingsMutation(channel.id);
  const isDisconnected = channel.status === "DISCONNECTED";

  const handleUpdateTeams = (teamIds: string[]) => {
    updateMutation.mutate({ teams: teamIds });
  };

  return (
    <Card
      className={`p-6 transition-all hover:shadow-md border-gray-200 ${isDisconnected ? "bg-red-50/30" : ""}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 min-w-[200px]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">
              {channel.phoneDisplayName || channel.phone || channel.phoneId}
            </h3>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {channel.type}
            </Badge>
            {channel.status && (
              <Badge
                variant={isDisconnected ? "destructive" : "default"}
                className={`text-[10px] h-5 px-1.5 ${!isDisconnected && "bg-green-600 hover:bg-green-700"}`}
              >
                {channel.status}
              </Badge>
            )}
          </div>
          {channel.igUserName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="bg-gradient-to-tr from-yellow-400 to-purple-600 w-2 h-2 rounded-full" />
              Instagram: @{channel.igUserName}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground font-mono">
            ID: {channel.id.slice(0, 8)}...
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                {t("Assigned Teams")}
              </label>
              {updateMutation.isPending && (
                <span className="text-[10px] text-primary animate-pulse font-medium">
                  {t("Saving")}
                </span>
              )}
            </div>
            <MultiSelect
              placeholder={t("Select teams that can access this channel...")}
              options={teamOptions}
              defaultValue={channel.teams?.map((team: any) => team.id) || []}
              onValueChange={handleUpdateTeams}
              searchable
              disabled={isDisconnected}
              emptyIndicator={
                <p className="text-center text-sm">{t("No teams found")}</p>
              }
              className="w-full"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

const ChannelPermissionsPage = () => {
  const t = useTranslations();
  const { data: channels, isLoading: isLoadingChannels } = useWaSettings();
  const { data: teamsRes, isLoading: isLoadingTeams } = useTeamsByUser();

  const teams = teamsRes?.data || [];
  const teamOptions = teams.map((team: any) => ({
    value: team.id,
    label: team.name,
  }));

  if (isLoadingChannels || isLoadingTeams) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("Channel Permissions")}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          {t(
            "Configure which teams have access to specific communication channels, By default, if no teams are assigned, the channel will be restricted (no one except super admins can access it)",
          )}
        </p>
      </div>

      <Alert variant="default" className="bg-blue-50/50 border-blue-100">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 text-sm font-semibold">
          {t("Permissions Logic")}
        </AlertTitle>
        <AlertDescription className="text-blue-700 text-xs">
          {t(
            "Assigning a team to a channel gives all members of that team visibility of that channel in the Inbox, Super admins always have access to all channels",
          )}
        </AlertDescription>
      </Alert>

      {channels?.some((c: any) => c.status === "DISCONNECTED") && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("Attention Needed")}</AlertTitle>
          <AlertDescription>
            {t(
              "One or more of your WhatsApp channels are disconnected. Please reconnect them to continue using their features.",
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {channels && channels.length > 0 ? (
          channels.map((channel: any) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              teamOptions={teamOptions}
              translations={t}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {t("No channels configured")}
            </h3>
            <p className="text-gray-500 text-sm">
              {t("Connect a WhatsApp character to see it here")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelPermissionsPage;
