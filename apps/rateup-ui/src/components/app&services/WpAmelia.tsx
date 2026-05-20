"use client";

import { useEffect } from "react";

import { ActionIcon, Group, Skeleton, Stack, Title } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import { IntegratedApps } from "@/types/enums.ts";
import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";

export function WpAmelia() {
  const { data, isPending, isError } = useIntegrationByType(
    IntegratedApps.amelia,
  );
  const createIntegrationMutation = useCreateIntegrationMutation(
    IntegratedApps.amelia,
  );

  const updateIntegrationMutation = useUpdateIntegrationMutation(
    IntegratedApps.amelia,
  );
  const deleteIntegrationMutation = useDeleteIntegrationMutation(
    IntegratedApps.amelia,
  );
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
    initialValues: initialValues,
    validate: schemaResolver(schema, { sync: true }),
  });

  useEffect(() => {
    form.setValues(data?.credential ?? initialValues);
    form.resetDirty();
  }, [data]);

  const handleSave = () => {
    const { hasErrors } = form.validate();
    if (hasErrors) return;

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
    <Stack p={"xl"}>
      <Title order={3}>{translations("Amelia Config")}</Title>
      <PaperLayout>
        {isPending ||
        createIntegrationMutation?.isPending ||
        updateIntegrationMutation?.isPending ? (
          <Skeleton w={500} h={30} />
        ) : (
          <Stack w={500}>
            <ContainedTextField
              label={translations("Amelia")}
              placeholder={translations("Enter your api key")}
              {...form.getInputProps("apiKey")}
            />

            <ContainedTextField
              label={translations("Amelia base url")}
              placeholder={translations("Enter your base url")}
              type="url"
              {...form.getInputProps("baseUrl")}
            />
            <ContainedNumberInput
              label={translations("serviceId")}
              placeholder={translations("Enter serviceId")}
              {...form.getInputProps("serviceId")}
              min={0}
            />
            <Group justify="space-between">
              <RateupButtonPrimary
                title={translations("save")}
                onClick={handleSave}
                disabled={!form.isDirty()}
              />
              <ActionIcon
                loading={deleteIntegrationMutation?.isPending}
                disabled={!data?.credential?.apiKey && !data?.credential?.base}
                onClick={() => {
                  toast.loading(translations("Deleting.."), {
                    id: "integration-delete",
                  });
                  deleteIntegrationMutation.mutate();
                }}
              >
                <IconTrash />
              </ActionIcon>
            </Group>
          </Stack>
        )}
      </PaperLayout>
    </Stack>
  );
}
