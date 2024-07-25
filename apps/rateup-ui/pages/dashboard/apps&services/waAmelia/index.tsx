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
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const WaAmelia = () => {
  const { data, isPending, isError } = useIntegrationByType(
    IntegratedApps.waAmelia,
  );
  const createIntegrationMutation = useCreateIntegrationMutation(
    IntegratedApps.waAmelia,
  );

  const updateIntegrationMutation = useUpdateIntegrationMutation(
    IntegratedApps.waAmelia,
  );
  const deleteIntegrationMutation = useDeleteIntegrationMutation(
    IntegratedApps.waAmelia,
  );

  const schema = z.object({
    apiKey: z.string(),
    baseUrl: z.string().trim().url(),
  });
  const initialValues = {
    apiKey: "",
    baseUrl: "",
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
        },
        name: IntegratedApps.waAmelia,
      });
    } else {
      createIntegrationMutation.mutate({
        credential: {
          apiKey: form.getValues().apiKey,
          baseUrl: form.getValues().baseUrl,
        },
        name: IntegratedApps.waAmelia,
      });
    }
  };
  return (
    <Stack p={"xl"}>
      <Title order={3}>Wa Amelia Config</Title>
      <PaperLayout>
        {isPending ||
        createIntegrationMutation?.isPending ||
        updateIntegrationMutation?.isPending ? (
          <Skeleton w={500} h={30} />
        ) : (
          <>
            <Group w={"100%"}>
              <ContainedTextField
                label={"Wa Amelia"}
                placeholder="Enter you api key"
                w={500}
                {...form.getInputProps("apiKey")}
              />
              <ActionIcon
                mt={"lg"}
                loading={deleteIntegrationMutation?.isPending}
                disabled={!data?.credential?.apiKey && !data?.credential?.base}
                onClick={() => {
                  deleteIntegrationMutation.mutate(data?.id);
                }}
              >
                <IconTrash />
              </ActionIcon>
            </Group>
            <Box mt={"lg"}>
              <ContainedTextField
                label={"Wa Amelia base url"}
                placeholder="Enter you base url"
                type="url"
                w={500}
                {...form.getInputProps("baseUrl")}
                mb={"lg"}
              />
              <RateupButtonPrimary
                title="save"
                onClick={handleSave}
                disabled={!form.isDirty()}
              />
            </Box>
          </>
        )}
      </PaperLayout>
    </Stack>
  );
};

export default WaAmelia;
