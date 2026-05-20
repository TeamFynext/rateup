"use client";

import { useEffect } from "react";

import { isNotEmpty, useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useDeleteWaSettingsMutation,
  useUpsertWaSettingsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

type WaSetting = WaSettings[number];

export function WhatsAppManualConfiguration({
  waSettings,
}: Readonly<{ waSettings: WaSetting | undefined }>) {
  const { t: translations } = useTranslation();

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
      form.setValues(waSettings);
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
