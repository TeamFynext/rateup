import {
  ActionIcon,
  Box,
  Center,
  CopyButton,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconChecks, IconCopy, IconHelp } from "@tabler/icons-react";
import { useEffect } from "react";
import { WHATSAPP_URL } from "../../../backend/whatsapp";
import {
  useUpsertWaSettingsMutation,
  useWaSettings,
} from "../../../backend/whatsapp/settings/waSettings.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import { SAVE_HOTKEY } from "../../../utils/constants";
export default function WhatappSettings() {
  const { data: waSettings, isLoading } = useWaSettings();
  const form = useForm({
    initialValues: waSettings || {
      businessId: "",
      phoneId: "",
      accessToken: "",
      webhookPassword: "",
      appId: "",
    },
    validate: {
      businessId: isNotEmpty("BusnessId is required"),
      phoneId: isNotEmpty("phoneId is required"),
      accessToken: isNotEmpty("AccessToken is required"),
      webhookPassword: isNotEmpty("Webhook Password is required"),
      appId: isNotEmpty("AppId is required"),
    },
  });

  useEffect(() => {
    if (waSettings) {
      form.setValues(waSettings);
    }
  }, [waSettings]);

  const upsertMutation = useUpsertWaSettingsMutation();
  const handleSubmit = (values: any) => {
    upsertMutation.mutate(values);
  };
  if (isLoading) return <RateupLoader h={"100dvh"} />;
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_API_URL
  }/api${WHATSAPP_URL}/webhook/${
    JSON.parse(localStorage.getItem("userInfo")).data.orgId
  }`;
  return (
    <>
      <h2>WhatsApp Settings</h2>
      <Flex w="100%" align="stretch" gap={"sm"}>
        <form
          onSubmit={form.onSubmit(handleSubmit)}
          style={{ flexGrow: 1 }}
          onKeyDown={getHotkeyHandler([
            [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
          ])}
        >
          <Stack px="md">
            <ContainedTextField
              label="Business ID"
              placeholder="Enter your business ID"
              {...form.getInputProps("businessId")}
              required
            />
            <ContainedTextField
              label="Phone ID"
              placeholder="Enter your phone ID"
              required
              {...form.getInputProps("phoneId")}
            />
            <ContainedTextField
              label="App Id"
              placeholder="Enter your app ID"
              required
              {...form.getInputProps("appId")}
            />
            <ContainedTextArea
              label="Access Token"
              placeholder="Enter your access token"
              autosize
              minRows={2}
              maxRows={4}
              required
              {...form.getInputProps("accessToken")}
            />
            <ContainedTextField
              label="Webhook Password"
              placeholder="Create a webhook password"
              required
              {...form.getInputProps("webhookPassword")}
            />
            <ContainedTextField
              label="Webhook Password"
              placeholder="Create a webhook password"
              required
              {...form.getInputProps("webhookPassword")}
            />
            <Center mt="xl">
              <RateupButtonPrimary type="submit" title={"Save Changes"} />
            </Center>
          </Stack>
        </form>
        <Divider
          orientation="vertical"
          style={{
            flexGrow: 0,
          }}
        />
        <Stack style={{ flexGrow: 1 }} px="md">
          <Box>
            <Group>
              <Text>Webhook URL</Text>
              <Tooltip
                label={
                  "Paste this url in your facebook app under whatsapp configuration @developers.facebook.com/apps/"
                }
              >
                <ActionIcon variant="transparent" color="gray">
                  <IconHelp />
                </ActionIcon>
              </Tooltip>
            </Group>
            <ContainedTextField
              readOnly
              value={webhookUrl}
              rightSection={
                <CopyButton value={webhookUrl}>
                  {({ copied, copy }) => (
                    <ActionIcon
                      variant={copied ? "filled" : "transparent"}
                      color={copied ? "teal" : "blue"}
                      onClick={copy}
                    >
                      {copied ? <IconChecks /> : <IconCopy />}
                    </ActionIcon>
                  )}
                </CopyButton>
              }
            />
          </Box>
        </Stack>
      </Flex>
    </>
  );
}
