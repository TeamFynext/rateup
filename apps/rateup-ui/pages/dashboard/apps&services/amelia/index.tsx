import { useEffect } from "react";

import { ActionIcon, Box, Group, Skeleton, Stack, Title } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import { z } from "zod";

import { IntegratedApps } from "@/types/enums";
import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const WpAmelia = () => {
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

  const schema = z.object({
    apiKey: z.string(),
    baseUrl: z.string().trim().url(),
    serviceId: z.number(),
  });
  const initialValues = {
    apiKey: "",
    baseUrl: "",
    serviceId: 3,
  };
  const form = useForm<z.infer<typeof schema>>({
    initialValues: initialValues,
    validate: zodResolver(schema),
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
        id: data?.id,
        credential: {
          apiKey: form.getValues().apiKey,
          baseUrl: form.getValues().baseUrl,
          serviceId: form.getValues().serviceId,
        },
        name: IntegratedApps.amelia,
      });
    } else {
      createIntegrationMutation.mutate({
        credential: {
          apiKey: form.getValues().apiKey,
          baseUrl: form.getValues().baseUrl,
          serviceId: form.getValues().serviceId,
        },
        name: IntegratedApps.amelia,
      });
    }
  };
  return (
    <Stack p={"xl"}>
      <Title order={3}>Amelia Config</Title>
      <PaperLayout>
        {isPending ||
        createIntegrationMutation?.isPending ||
        updateIntegrationMutation?.isPending ? (
          <Skeleton w={500} h={30} />
        ) : (
          <Stack w={500}>
            <ContainedTextField
              label={"Amelia"}
              placeholder="Enter you api key"
              {...form.getInputProps("apiKey")}
            />

            <ContainedTextField
              label={"Amelia base url"}
              placeholder="Enter you base url"
              type="url"
              {...form.getInputProps("baseUrl")}
            />
            <ContainedNumberInput
              label={"serviceId"}
              placeholder="Enter serviceId"
              {...form.getInputProps("serviceId")}
              min={0}
            />
            <Group justify="space-between">
              <RateupButtonPrimary
                title="save"
                onClick={handleSave}
                disabled={!form.isDirty()}
              />
              <ActionIcon
                loading={deleteIntegrationMutation?.isPending}
                disabled={!data?.credential?.apiKey && !data?.credential?.base}
                onClick={() => {
                  deleteIntegrationMutation.mutate(data?.id);
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
};

export default WpAmelia;
