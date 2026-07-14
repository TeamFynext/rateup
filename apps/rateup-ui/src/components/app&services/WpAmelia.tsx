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
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { IntegratedApps } from "@/types/enums.ts";

import { Card } from "../ui/card";

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
  return (
    <div className="flex flex-col gap-4 p-8">
      <h3 className="text-xl font-semibold">{translations("Amelia Config")}</h3>
      <Card className="p-4">
        {isPending ||
        createIntegrationMutation?.isPending ||
        updateIntegrationMutation?.isPending ? (
          <Skeleton className="h-8 w-125" />
        ) : (
          <FieldGroup className="w-125 gap-4">
            <Controller
              name="apiKey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>{translations("Amelia")}</FieldLabel>
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
                  <FieldLabel htmlFor={field.name}>{translations("Amelia base url")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="url"
                    aria-invalid={fieldState.invalid}
                    placeholder={translations("Enter your base url")}
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
                  <FieldLabel htmlFor={field.name}>{translations("serviceId")}</FieldLabel>
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
            <div className="flex items-center justify-between">
              <Button onClick={form.handleSubmit(handleSave)} disabled={!form.formState.isDirty}>
                {translations("save")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={
                  deleteIntegrationMutation?.isPending ||
                  (!data?.credential?.apiKey && !data?.credential?.base)
                }
                onClick={() => {
                  toast.loading(translations("Deleting.."), {
                    id: "integration-delete",
                  });
                  deleteIntegrationMutation.mutate();
                }}
              >
                <IconTrash />
              </Button>
            </div>
          </FieldGroup>
        )}
      </Card>
    </div>
  );
}
