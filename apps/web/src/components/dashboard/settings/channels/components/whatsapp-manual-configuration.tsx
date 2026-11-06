import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@rateup/ui/components/button";
import { Input } from "@rateup/ui/components/input";
import { Textarea } from "@rateup/ui/components/textarea";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useUpsertWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";

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

/**
 * The IDs and token behind a manually configured number: blank to add one, filled to edit
 * one. Disconnecting lives on the account row, beside the automated accounts' own.
 */
export function WaManualCredentialsForm({
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

  const handleSubmit = (values: WaManualConfigFormValues) => {
    let payload: Record<string, unknown> = { ...values };
    if (waSettings) payload = { ...waSettings, ...values };
    if ("teams" in payload) delete payload.teams;
    // An existing channel edits its name through its own form, which saves on its own; leaving
    // the name out here stops this form's older copy of it from overwriting a fresh rename.
    if (waSettings) delete payload.phoneDisplayName;
    upsertMutation.mutate(payload, { onSuccess: () => onSaved?.() });
  };

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

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {translations("Cancel")}
          </Button>
        )}
        <Button type="submit" loading={upsertMutation.isPending}>
          {translations("Save Changes")}
        </Button>
      </div>
    </form>
  );

  return credentialsForm;
}
