"use client";

import { useEffect } from "react";

import { isNotEmpty, useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useTeamsByUser } from "@/backend/team/team.query";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useDeleteWaSettingsMutation,
  useUpsertWaSettingsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { TeamAssignmentSection } from "./team-assignment-section";

type WaSetting = WaSettings[number];

export function WhatsAppManualConfiguration({
  waSettings,
}: Readonly<{ waSettings: WaSetting | undefined }>) {
  const translations = useTranslations();
  const { data: teamsRes, isLoading: isLoadingTeams } = useTeamsByUser();

  const teams = teamsRes?.data || [];
  const teamOptions = teams.map((team: any) => ({
    value: team.id,
    label: team.name,
  }));

  const assignedTeamIds = waSettings?.teams?.map((team: any) => team.id) || [];

  const form = useForm({
    initialValues: {
      wabaId: "",
      phoneId: "",
      accessToken: "",
      webhookPassword: "",
      appId: "",
      fbPageId: "",
      ibaId: "",
      pageAccessToken: "",
      phoneDisplayName: "",
    },
    validate: {
      wabaId: isNotEmpty("BusnessId is required"),
      phoneId: isNotEmpty("phoneId is required"),
      accessToken: isNotEmpty("AccessToken is required"),
      webhookPassword: isNotEmpty("Webhook Password is required"),
      appId: isNotEmpty("AppId is required"),
    },
  });

  useEffect(() => {
    if (waSettings) {
      const { teams, ...rest } = waSettings;
      form.setValues(rest);
    } else {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waSettings?.id]);

  const upsertMutation = useUpsertWaSettingsMutation();
  const deleteMutation = useDeleteWaSettingsMutation();

  const handleSubmit = (values: Record<string, string>) => {
    let payload: Record<string, unknown> = { ...values };
    if (waSettings) payload = { ...waSettings, ...values };
    if ("teams" in payload) delete payload.teams;
    upsertMutation.mutate(payload);
  };

  const handleDelete = () => deleteMutation.mutate(waSettings?.phoneId);

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardDescription>
          Configure this WhatsApp Business Account manually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.onSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phoneDisplayName">Channel Name</Label>
            <Input
              id="phoneDisplayName"
              placeholder={translations(
                "Enter a name to identify this WhatsApp channel",
              )}
              {...form.getInputProps("phoneDisplayName")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wabaId">WABA ID</Label>
              <Input
                id="wabaId"
                placeholder={translations(
                  "Enter your Whatsapp Business Account ID",
                )}
                {...form.getInputProps("wabaId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneId">Phone ID</Label>
              <Input
                id="phoneId"
                placeholder={translations("Enter your phone ID")}
                {...form.getInputProps("phoneId")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appId">App ID</Label>
              <Input
                id="appId"
                placeholder={translations("Enter your app ID")}
                {...form.getInputProps("appId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookPassword">Webhook Password</Label>
              <Input
                id="webhookPassword"
                type="password"
                placeholder={translations("Create a webhook password")}
                {...form.getInputProps("webhookPassword")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Textarea
              id="accessToken"
              placeholder={translations("Enter your access token")}
              rows={3}
              {...form.getInputProps("accessToken")}
            />
          </div>

          {waSettings && (
            <div className="relative rounded-lg border border-dashed border-border/50 bg-accent/30 p-4">
              <TeamAssignmentSection
                waSettingId={waSettings.id}
                assignedTeamIds={assignedTeamIds}
                teamOptions={teamOptions}
                isLoadingTeams={isLoadingTeams}
                translations={translations}
                instagramConnectionData={{
                  fbPageId: waSettings?.fbPageId,
                }}
              />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!waSettings}
            >
              <IconTrash size={18} className="mr-2" />
              {translations("Delete Configuration")}
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending
                ? "Saving"
                : translations("Save Changes")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
