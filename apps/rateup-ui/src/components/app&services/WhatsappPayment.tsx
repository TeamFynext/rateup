import { ActionIcon, Badge, Box, Flex, Group, Stack, Text, Tooltip } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import dayjs from "dayjs";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useDeleteWaPaymentConfigurationMutation,
  useGetWaPaymentConfigurationByNameMutation,
  useIntegrationByType,
  useRegenerateWaPaymentConfigurationOauthMutation,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import {
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput.tsx";
import { MCC, PROVIDER_NAMES } from "@/components/integrations/utils.ts";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import FormModalLayout from "@/components/Modal/FormModalLayout.tsx";
import NothingFound from "@/components/NothingFound/NothingFound.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { IntegratedApps } from "@/types/enums.ts";

// TODO: re add create and get all wa payment config list
enum Providers {
  razorpay = "razorpay",
  payu = "payu",
  zaakpay = "zaakpay",
}

export function WhatsappPayment() {
  const [opened, { close, open }] = useDisclosure(false);
  const { data, isPending } = useIntegrationByType(IntegratedApps.waPayment);
  // const { refetch } = useWaPaymentConfigurations();
  // const createWaPaymentConfigurationMutation =
  //   useCreateWaPaymentConfigurationMutation(IntegratedApps.waPayment);
  const getWaPaymentConfigurationByNameMutation = useGetWaPaymentConfigurationByNameMutation(
    IntegratedApps.waPayment,
  );
  const regenerateWaPaymentConfigurationOauthMutation =
    useRegenerateWaPaymentConfigurationOauthMutation(IntegratedApps.waPayment);
  const deleteMutation = useDeleteWaPaymentConfigurationMutation(IntegratedApps.waPayment);
  const schema = z.object({
    configuration_name: z
      .string()
      .min(4, "configuration_name must be at least 4 characters long")
      .max(40, "configuration_name must be at most 40 characters long")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "configuration_name can only contain alphanumeric characters, periods, hyphens, and underscores",
      )
      .regex(/^\S*$/, "configuration_name cannot contain spaces"),
    purpose_code: z.string().min(1),
    merchant_category_code: z.string().min(1),
    provider_name: z.nativeEnum(Providers),
  });
  const getConfigSchema = z.object({
    configuration_name: z
      .string()
      .min(4, "configuration_name must be at least 4 characters long")
      .max(40, "configuration_name must be at most 40 characters long")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "configuration_name can only contain alphanumeric characters, periods, hyphens, and underscores",
      )
      .regex(/^\S*$/, "configuration_name cannot contain spaces"),
  });
  const form = useForm<z.infer<typeof schema>>({
    mode: "uncontrolled",
    initialValues: {
      configuration_name: "",
      purpose_code: "00",
      merchant_category_code: "0000",
      provider_name: Providers.razorpay,
    },
    validate: schemaResolver(schema, {
      sync: true,
    }),
  });
  const getConfigForm = useForm<z.infer<typeof getConfigSchema>>({
    mode: "uncontrolled",
    initialValues: {
      configuration_name: "",
    },
    validate: schemaResolver(getConfigSchema, {
      sync: true,
    }),
  });
  if (isPending) <RateupLoader />;
  const handleSubmit = () => {
    // showLoadingToast(
    //   "whatsapp payment configuration creating...",
    //   "waPaymentConfigurations-create",
    //   true,
    // );
    // createWaPaymentConfigurationMutation.mutate(form.getValues());
    // form.reset();
    toast.loading("getting whatsapp payment configuration...", {
      id: "waPaymentConfiguration-get-by-name",
    });
    getWaPaymentConfigurationByNameMutation.mutate(getConfigForm.getValues());
    getConfigForm.reset();
    close();
  };

  return (
    <Stack h={"100%"}>
      <Group>
        {/* <RateupButtonPrimary
          title="New Configuration"
          rightIcon={<IconPlus />}
          onClick={open}
        /> */}
        <RateupButtonPrimary
          title="Get Configuration From Whatsapp"
          variant="light"
          rightIcon={<IconRefresh />}
          onClick={() => {
            open();
            // refetch().then(() => integrationListRefetch());
          }}
        />
        <FormModalLayout
          onClose={() => {
            close();
            form.reset();
          }}
          opened={opened}
          title="Get Configuration"
          noCustomHeader
          centered
          onSubmit={getConfigForm.onSubmit(handleSubmit)}
          includeCancelButton
          buttonTitle={"Submit"}
        >
          <Stack gap={"xs"}>
            <ContainedTextField
              label={"Payment configuration name"}
              placeholder="Enter configuration name"
              {...getConfigForm.getInputProps("configuration_name")}
            />
          </Stack>
        </FormModalLayout>
        <FormModalLayout
          onClose={() => {
            close();
            form.reset();
          }}
          opened={
            // opened
            null
          }
          title="New Configuration"
          noCustomHeader
          centered
          onSubmit={form.onSubmit(handleSubmit)}
          includeCancelButton
          buttonTitle={"Submit"}
        >
          <Stack gap={"xs"}>
            <ContainedTextField
              label={"Payment configuration name"}
              placeholder="Enter configuration name"
              {...form.getInputProps("configuration_name")}
            />
            <ContainedSelection
              label={"Merchant category code (MCC)"}
              data={MCC}
              placeholder="Select merchant category code (MCC)"
              {...form.getInputProps("merchant_category_code")}
            />
            <ContainedSelection
              label={"Purpose code"}
              data={PROVIDER_NAMES}
              placeholder="Select purpose code"
              {...form.getInputProps("purpose_code")}
            />
            <ContainedSelection
              label={"Provider name"}
              data={Object.keys(Providers)}
              placeholder="Select provider name"
              {...form.getInputProps("provider_name")}
            />
          </Stack>
        </FormModalLayout>
      </Group>
      <WhatsappPaymentList
        data={data}
        deleteMutation={deleteMutation}
        regenerateWaPaymentConfigurationOauthMutation={
          regenerateWaPaymentConfigurationOauthMutation
        }
      />
    </Stack>
  );
}

function WhatsappPaymentList({
  data,
  deleteMutation: _deleteMutation,
  regenerateWaPaymentConfigurationOauthMutation,
}) {
  if (!data?.credential || data?.credential?.length === 0) return <NothingFound text="" />;
  return (
    <Box className={clsx("cards-grid-global-class")}>
      {data?.credential?.map((credential) => (
        <PaperLayout layoutAnimation key={credential?.configuration_name}>
          <Stack justify="space-between" h={"100%"} gap={4}>
            <Flex justify={"space-between"} align={"center"}>
              <Text mr={"sm"} truncate fz="lg" fw={500}>
                {credential?.configuration_name}
              </Text>
              {/* <WhatsappPaymentCardMenu
                name={credential?.configuration_name}
                deleteMutation={deleteMutation}
              /> */}
            </Flex>
            <Box>
              <Text>MCC: {credential?.merchant_category_code?.description}</Text>
              <Text>PC: {credential?.purpose_code?.description}</Text>
            </Box>
            <Group>
              {credential.status === "Needs Connecting" &&
                credential?.expiration &&
                (dayjs.unix(credential?.expiration).isBefore(dayjs()) ? (
                  <>
                    <Tooltip label={"Click to refresh button to regenerate verification link"}>
                      <Link to={credential?.oauth_url} target="_blank">
                        <RateupButtonPrimary
                          title="Click to verify"
                          variant="light"
                          size="xs"
                          disabled
                        />
                      </Link>
                    </Tooltip>
                    <Tooltip label={"Click to regenerate verification link"}>
                      <ActionIcon
                        variant="light"
                        onClick={() =>
                          regenerateWaPaymentConfigurationOauthMutation.mutate(
                            credential?.configuration_name,
                          )
                        }
                      >
                        <IconRefresh />
                      </ActionIcon>
                    </Tooltip>
                  </>
                ) : (
                  <Link to={credential?.oauth_url} target="_blank">
                    <RateupButtonPrimary title="Click to verify" size="xs" />
                  </Link>
                ))}
            </Group>
            <Group justify="space-between">
              <Badge variant="light" color="orange">
                {credential?.provider_name ?? "RazorPay"}
              </Badge>
              <Badge variant="light" color="green">
                {credential?.status}
              </Badge>
            </Group>
          </Stack>
        </PaperLayout>
      ))}
    </Box>
  );
}
