import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { IntegratedApps } from "@/types/enums.ts";

export function WpAmelia() {
  const { data, isPending } = useIntegrationByType(IntegratedApps.amelia);
  const createIntegrationMutation = useCreateIntegrationMutation(IntegratedApps.amelia);

  const updateIntegrationMutation = useUpdateIntegrationMutation(IntegratedApps.amelia);
  const deleteIntegrationMutation = useDeleteIntegrationMutation(IntegratedApps.amelia);
  const { t: translations } = useTranslation();
  const schema = z.object({
    apiKey: z.string(),
    baseUrl: z.url(),
    serviceId: z.number(),
  });
  const initialValues = {
    apiKey: "",
    baseUrl: "",
    serviceId: 3,
  };
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(data?.credential ?? initialValues);
  }, [data]);

  const handleSave = () => {
    if (data?.id) {
      updateIntegrationMutation.mutate({
        credential: {
          apiKey: form.getValues().apiKey,
          baseUrl: form.getValues().baseUrl,
          serviceId: form.getValues().serviceId,
        },
      });
    } else {
      createIntegrationMutation.mutate({
        credential: {
          apiKey: form.getValues().apiKey,
          baseUrl: form.getValues().baseUrl,
          serviceId: form.getValues().serviceId,
        },
      });
    }
  };
  const config = INTEGRATIONS_CONFIG.amelia;
  const isConnected = Boolean(data?.credential?.apiKey);
  const isSaving = createIntegrationMutation?.isPending || updateIntegrationMutation?.isPending;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={isConnected}
      detail={data?.credential?.baseUrl}
    >
      <IntegrationFormCard
        title={translations("Connection")}
        description={translations(
          "The API key and site address RateUp uses to read your bookings.",
        )}
        onSubmit={form.handleSubmit(handleSave)}
        actions={
          <>
            <Button type="submit" disabled={!form.formState.isDirty}>
              {translations("Save changes")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={
                deleteIntegrationMutation?.isPending ||
                (!data?.credential?.apiKey && !data?.credential?.base)
              }
              onClick={() => {
                toast.loading(translations("Disconnecting Amelia"), {
                  id: "integration-delete",
                });
                deleteIntegrationMutation.mutate();
              }}
            >
              <IconTrash data-icon="inline-start" />
              {translations("Disconnect")}
            </Button>
          </>
        }
      >
        {isPending || isSaving ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : (
          <>
            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("API key")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Enter your api key")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="baseUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("Site address")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="url"
                    aria-invalid={fieldState.invalid}
                    placeholder="https://example.com"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="serviceId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("Service ID")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={0}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder={translations("Enter serviceId")}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </>
        )}
      </IntegrationFormCard>
    </IntegrationShell>
  );
}
