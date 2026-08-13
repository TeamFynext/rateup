import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import { useUpdateWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

interface ChannelNameFormValues {
  phoneDisplayName: string;
}

/**
 * The channel's name inside RateUp — what the channel list, pickers and templates label it
 * with. Purely ours: saving it touches no Meta API and needs no re-registration, which is
 * why it is a separate form from the WhatsApp display name.
 */
export function WaChannelNameForm({
  settingId,
  channelName,
}: Readonly<{
  settingId: string;
  channelName?: string | null;
}>) {
  const { t: translations } = useTranslation();
  const updateMutation = useUpdateWaSettingsMutation(settingId);

  const schema = z.object({
    phoneDisplayName: z.string().trim().max(100, translations("Channel name is too long")),
  });

  const form = useForm<ChannelNameFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phoneDisplayName: channelName || "" },
  });

  function handleSubmit(values: ChannelNameFormValues) {
    updateMutation.mutate(
      { phoneDisplayName: values.phoneDisplayName.trim() },
      { onSuccess: () => form.reset(values) },
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      <Controller
        name="phoneDisplayName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${settingId}-phoneDisplayName`}>
              {translations("Channel name")}
            </FieldLabel>
            <div className="flex flex-wrap items-start gap-2">
              <Input
                {...field}
                id={`${settingId}-phoneDisplayName`}
                aria-invalid={fieldState.invalid}
                className="min-w-48 flex-1"
                placeholder={translations("Enter a name to identify this WhatsApp channel")}
              />
              <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
                {updateMutation.isPending && <Spinner />}
                {translations("Save name")}
              </Button>
            </div>
            <FieldDescription>
              {translations("Only used inside RateUp. Customers never see it.")}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </form>
  );
}
