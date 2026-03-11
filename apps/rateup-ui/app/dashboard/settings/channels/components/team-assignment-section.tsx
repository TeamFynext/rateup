"use client";

import { Skeleton, Stack } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";

import { useUpdateWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { MultiSelect } from "@/components/ui/multi-select";

export function TeamAssignmentSection({
  waSettingId,
  assignedTeamIds,
  teamOptions,
  isLoadingTeams,
  translations: t,
  instagramConnectionData,
}: Readonly<{
  waSettingId: string;
  assignedTeamIds: string[];
  teamOptions: Array<{ value: string; label: string }>;
  isLoadingTeams: boolean;
  translations: any;
  instagramConnectionData?: {
    fbPageId?: string | null;
  };
}>) {
  const updateMutation = useUpdateWaSettingsMutation(waSettingId);

  const handleUpdateTeams = (teamIds: string[]) => {
    const payload: Record<string, any> = { teams: teamIds };
    if (instagramConnectionData) {
      payload.fbPageId = instagramConnectionData.fbPageId;
    }
    updateMutation.mutate(payload);
  };

  if (isLoadingTeams) {
    return (
      <Stack gap="xs">
        <Skeleton height={20} width="100" />
        <Skeleton height={40} width="100%" />
      </Stack>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <IconBrandWhatsapp className="w-3.5 h-3.5" />
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
        defaultValue={assignedTeamIds}
        onValueChange={handleUpdateTeams}
        searchable
        emptyIndicator={
          <p className="text-center text-sm">{t("No teams found")}</p>
        }
        className="w-full"
      />
      <p className="text-xs text-muted-foreground mt-2">
        {t(
          "Assigning a team to a channel gives all members of that team visibility of this channel in the Inbox",
        )}
      </p>
    </div>
  );
}
