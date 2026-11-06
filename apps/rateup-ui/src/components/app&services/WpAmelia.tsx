import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useConnectAmeliaMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
} from "@/backend/appsIntegration/integration.query";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import type { AmeliaCredential } from "@/types/global";

const schema = z.object({
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim(),
  serviceId: z.number().int().positive(),
});
type AmeliaForm = z.infer<typeof schema>;

const EMPTY_FORM: AmeliaForm = { baseUrl: "", apiKey: "", serviceId: 3 };

/** The site an admin recognises, from the API address the credential stores. */
function siteAddress(baseUrl: string | undefined) {
  return (baseUrl ?? "").replace(/\/wp-admin\/admin-ajax\.php.*$/i, "");
}

export function WpAmelia() {
  const { data, isPending } = useIntegrationByType(IntegratedApps.amelia);
  const connectMutation = useConnectAmeliaMutation();
  const deleteIntegrationMutation = useDeleteIntegrationMutation(IntegratedApps.amelia);
  const { t: translations } = useTranslation();

  const credential: Partial<AmeliaCredential> | undefined = data?.credential;
  const hasApiKey = Boolean(credential?.hasApiKey);
  const isConnected = Boolean(data?.id);

  const form = useForm<AmeliaForm>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    form.reset(
      credential
        ? {
            baseUrl: siteAddress(credential.baseUrl),
            apiKey: "",
            serviceId: credential.serviceId ?? EMPTY_FORM.serviceId,
          }
        : EMPTY_FORM,
    );
  }, [data]);

  const handleSave = (values: AmeliaForm) => {
    connectMutation.mutate(values, {
      onSuccess: () => form.reset({ ...values, apiKey: "" }),
    });
  };
  const config = INTEGRATIONS_CONFIG.amelia;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={isConnected}
      detail={siteAddress(credential?.baseUrl) || undefined}
    >
      <IntegrationFormCard
        title={translations("Connection")}
        description={translations(
          "The API key and site address RateUp uses to look up free times for your flows.",
        )}
        onSubmit={form.handleSubmit(handleSave)}
        actions={
          <>
            <Button
              type="submit"
              disabled={!form.formState.isDirty}
              loading={connectMutation.isPending}
            >
              {translations("Save changes")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={deleteIntegrationMutation.isPending || !isConnected}
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
        {isPending ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : (
          <>
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
                  <FieldDescription>
                    {translations("The WordPress site Amelia is installed on.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("API key")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    placeholder={
                      hasApiKey
                        ? translations("Saved. Leave blank to keep it.")
                        : translations("Enter your api key")
                    }
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
                    min={1}
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
