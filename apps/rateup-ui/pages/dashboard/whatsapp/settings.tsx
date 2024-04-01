import {
  ActionIcon,
  Box,
  Button,
  Center,
  CopyButton,
  Divider,
  Flex,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import {
  IconChecks,
  IconCopy,
  IconHelp,
  IconLogout,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { WHATSAPP_URL } from "../../../backend/whatsapp";
import {
  useDeregisterBusinessClientMutation,
  useRegisterBusinessClientMutation,
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
import Script from "next/script";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";

function WhatsAppManualConfiguration() {
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

const initFacebookSdk = () => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    window.fbAsyncInit = function () {
      //@ts-ignore
      window.FB.init({
        appId: "3634460296824137",
        cookie: true,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v19.0",
      });
    };
  });
};

const getFacebookLoginStatus = () => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    window.FB.getLoginStatus((response) => {
      resolve(response);
    });
  });
};

const fbLogin = () => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    window.FB.login(
      (response) => {
        resolve(response);
      },
      {
        config_id: "1570807597035749", // configuration ID obtained in the previous step goes here
        response_type: "code", // must be set to 'code' for System User access token
        override_default_response_type: true,
      },
    );
  });
};

function MetaLoginButton() {
  useEffect(() => {
    initFacebookSdk().then(() => {
      getFacebookLoginStatus().then((response) => {
        if (response == null) {
          console.log("No login status for the person");
        } else {
          console.log("loginstatus_res => ", response);
        }
      });
    });
  }, []);

  const registerMutation = useRegisterBusinessClientMutation();

  function login() {
    fbLogin().then((response: { authResponse: { code: string } }) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        registerMutation.mutate(code);
      } else {
        console.log("Error in meta login");
        console.log(response);
      }
    });
  }

  return <Button onClick={login}>Link WhatsApp Account</Button>;
}

export default function WhatsAppSettingsPage() {
  return (
    <Stack>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        crossOrigin="anonymous"
      ></Script>
      <h2>WhatsApp Settings</h2>
      <MetaLoginStatus />
    </Stack>
  );
}

function MetaLoginStatus() {
  const { data: waSettings, isLoading } = useWaSettings();

  const deRegisterMutation = useDeregisterBusinessClientMutation();
  const [openDeleteConfirmation, { open, close }] = useDisclosure(false);

  function handleDeRegister() {
    deRegisterMutation.mutate();
  }

  if (isLoading) {
    return <MetaLoginStatusLoaderSkeleton />;
  }

  if (waSettings) {
    return (
      <PaperLayout w={"fit-content"}>
        <Stack>
          <Group justify={"space-between"}>
            <Text
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
              }}
              c="dimmed"
            >
              Linked WhatsApp Business Account
            </Text>
            <Tooltip label={"Logout from WhatsApp Business Account"}>
              <ActionIcon variant="subtle" color="red" onClick={open}>
                <IconLogout />
              </ActionIcon>
            </Tooltip>
            <ConfirmationModal
              forDeleteFunctionality
              deleteQuotion={
                "Are you sure you want to DeRegister from WhatsApp Business Account?"
              }
              opened={openDeleteConfirmation}
              onClose={close}
              onConfirm={handleDeRegister}
              confirmLabel={"DeRegister"}
              headerLabel={"DeRegister WhatsApp Business Account"}
              headerTitle={"Confirmation Dialog"}
            />
          </Group>
          <Group gap={"xl"}>
            <ContainedTextField
              label="WhatsApp Business ID"
              value={waSettings.wabaId}
              readOnly
            />
            <ContainedTextField
              label="WhatsApp Phone Number"
              value={waSettings.phone}
              readOnly
            />
          </Group>
        </Stack>
      </PaperLayout>
    );
  } else {
    return <MetaLoginButton />;
  }
}

function MetaLoginStatusLoaderSkeleton() {
  return (
    <PaperLayout w={"fit-content"}>
      <Stack>
        <Skeleton height={8} width={"50%"} />
        <Group>
          <Skeleton height={30} width={300} />
          <Skeleton height={30} width={300} />
        </Group>
      </Stack>
    </PaperLayout>
  );
}
