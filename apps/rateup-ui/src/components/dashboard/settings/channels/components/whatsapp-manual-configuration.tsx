import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import {
  useDeleteWaSettingsMutation,
  useUpsertWaSettingsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { WaBusinessProfileForm } from "./wa-business-profile-form.tsx";
import { WaChannelNameForm } from "./wa-channel-name-form.tsx";
import { WaDisplayNamePanel } from "./wa-display-name-panel.tsx";

type WaSetting = WaSettings[number];

interface WaManualConfigFormValues {
  wabaId: string;
  phoneId: string;
  accessToken: string;
  webhookPassword: string;
  appId: string;
  phoneDisplayName: string;
}

const defaultFormValues: WaManualConfigFormValues = {
  wabaId: "",
  phoneId: "",
  accessToken: "",
  webhookPassword: "",
  appId: "",
  phoneDisplayName: "",
};

export function WhatsAppManualConfiguration({
  waSettings,
  onCancel,
  onSaved,
}: Readonly<{
  waSettings: WaSetting | undefined;
  onCancel?: () => void;
  onSaved?: () => void;
}>) {
  const { t: translations } = useTranslation();

  const waManualConfigSchema = z.object({
    wabaId: z.string().trim().min(1, translations("BusnessId is required")),
    phoneId: z.string().trim().min(1, translations("phoneId is required")),
    accessToken: z.string().trim().min(1, translations("AccessToken is required")),
    webhookPassword: z.string().trim().min(1, translations("Webhook Password is required")),
    appId: z.string().trim().min(1, translations("AppId is required")),
    phoneDisplayName: z.string(),
  });

  const form = useForm<WaManualConfigFormValues>({
    resolver: zodResolver(waManualConfigSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (waSettings) {
      form.reset({ ...defaultFormValues, ...waSettings });
    } else {
      form.reset(defaultFormValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waSettings?.id]);

  const upsertMutation = useUpsertWaSettingsMutation();
  const deleteMutation = useDeleteWaSettingsMutation();

  const handleSubmit = (values: WaManualConfigFormValues) => {
    let payload: Record<string, unknown> = { ...values };
    if (waSettings) payload = { ...waSettings, ...values };
    if ("teams" in payload) delete payload.teams;
    // An existing channel edits its name through its own form, which saves on its own; leaving
    // the name out here stops this form's older copy of it from overwriting a fresh rename.
    if (waSettings) delete payload.phoneDisplayName;
    upsertMutation.mutate(payload, { onSuccess: () => onSaved?.() });
  };

  const handleDelete = () => deleteMutation.mutate(waSettings?.phoneId ?? "");

  const credentialsForm = (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      {!waSettings && (
        <Controller
          name="phoneDisplayName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{translations("Channel name")}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={translations("Enter a name to identify this WhatsApp channel")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="wabaId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>WABA ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={translations("Enter your Whatsapp Business Account ID")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="phoneId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Phone ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={translations("Enter your phone ID")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="appId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>App ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={translations("Enter your app ID")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="webhookPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Webhook Password</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                aria-invalid={fieldState.invalid}
                placeholder={translations("Create a webhook password")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        name="accessToken"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Access Token</FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              rows={3}
              aria-invalid={fieldState.invalid}
              placeholder={translations("Enter your access token")}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex justify-between pt-2">
        {waSettings ? (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            <IconTrash size={18} className="mr-2" />
            {translations("Delete Configuration")}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onCancel} disabled={!onCancel}>
            {translations("Cancel")}
          </Button>
        )}
        <Button type="submit" loading={upsertMutation.isPending}>
          {translations("Save Changes")}
        </Button>
      </div>
    </form>
  );

  // A channel that does not exist yet has nothing at Meta to show, so it stays a plain form.
  if (!waSettings?.id) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardDescription>
            {translations("Configure this WhatsApp Business Account manually.")}
          </CardDescription>
        </CardHeader>
        <CardContent>{credentialsForm}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardDescription>
          {waSettings.phone || translations("Configure this WhatsApp Business Account manually.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Same three tabs as a connected account, so both configuration modes read alike. */}
        <Tabs key={waSettings.id} defaultValue="channel">
          <TabsList>
            <TabsTrigger value="channel">{translations("Channel")}</TabsTrigger>
            <TabsTrigger value="display-name">{translations("Display name")}</TabsTrigger>
            <TabsTrigger value="profile">{translations("Profile")}</TabsTrigger>
          </TabsList>

          <TabsContent value="channel" className="mt-4 flex flex-col gap-6">
            {/* Renaming saves on its own, without resubmitting the credentials below. */}
            <WaChannelNameForm
              settingId={waSettings.id}
              channelName={waSettings.phoneDisplayName}
            />
            <div className="border-t pt-4">{credentialsForm}</div>
          </TabsContent>

          <TabsContent value="display-name" className="mt-4">
            <p className="mb-4 text-xs text-muted-foreground">
              {translations(
                "Shown to customers in WhatsApp. Changes go to Meta for review and apply once approved.",
              )}
            </p>
            <WaDisplayNamePanel phoneId={waSettings.phoneId} />
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <p className="mb-4 text-xs text-muted-foreground">
              {translations(
                "The photo and details customers see when they open your business in WhatsApp.",
              )}
            </p>
            <WaBusinessProfileForm phoneId={waSettings.phoneId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
