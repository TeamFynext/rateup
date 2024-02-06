import {
  ActionIcon,
  Box,
  Button,
  Center,
  CopyButton,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  useUpsertWaSettingsMutation,
  useWaSettings,
} from "../../../backend/whatsapp/settings/waSettings.query";
import { useEffect } from "react";
import { IconChecks, IconCopy, IconHelp } from "@tabler/icons-react";
import { WHATSAPP_URL } from "../../../backend/whatsapp";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
export default function () {
  const { data: waSettings, isLoading } = useWaSettings();
  const form = useForm({
    initialValues: waSettings || {
      businessId: "",
      phoneId: "",
      accessToken: "",
      webhookPassword: "",
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
  if (isLoading) return <p>Loading...</p>;
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_API_URL
  }/api${WHATSAPP_URL}/webhook/${
    JSON.parse(localStorage.getItem("userInfo")).data.orgId
  }`;
  return (
    <>
      <h2>WhatsApp Settings</h2>
      <Flex w="100%" align="stretch" gap={"sm"}>
        <form onSubmit={form.onSubmit(handleSubmit)} style={{ flexGrow: 1 }}>
          <Stack px="md">
            <TextInput
              label="Business ID"
              placeholder="Enter your business ID"
              {...form.getInputProps("businessId")}
              required
            />
            <TextInput
              label="Phone ID"
              placeholder="Enter your phone ID"
              required
              {...form.getInputProps("phoneId")}
            />
            <Textarea
              label="Access Token"
              placeholder="Enter your access token"
              autosize
              minRows={2}
              maxRows={4}
              required
              {...form.getInputProps("accessToken")}
            />
            <TextInput
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
            <TextInput
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
