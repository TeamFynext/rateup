import { useEffect, useState } from "react";
import Script from "next/script";

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
  Tabs,
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
  IconTrash,
} from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { WHATSAPP_URL } from "../../../backend/whatsapp";
import {
  useDeleteWaSettingsMutation,
  useDeregisterBusinessClientMutation,
  useRegisterBusinessClientMutation,
  useUpsertWaSettingsMutation,
  useWaSettings,
} from "../../../backend/whatsapp/settings/waSettings.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  ContainedTextArea,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import { WaConfigType } from "../../../types/enums";
import { SAVE_HOTKEY } from "../../../utils/constants";
import styles from "./settings.style.module.css";

function WhatsAppManualConfiguration({ waSettings }) {
  const form = useForm({
    initialValues: {
      wabaId: "",
      phoneId: "",
      accessToken: "",
      webhookPassword: "",
      appId: "",
    },
    validate: {
      wabaId: isNotEmpty("BusnessId is required"),
      phoneId: isNotEmpty("phoneId is required"),
      accessToken: isNotEmpty("AccessToken is required"),
      webhookPassword: isNotEmpty("Webhook Password is required"),
      appId: isNotEmpty("AppId is required"),
    },
  });

  useEffect(() => {
    if (waSettings) {
      form.setValues(waSettings);
    } else {
      form.reset();
    }
  }, [waSettings]);

  const upsertMutation = useUpsertWaSettingsMutation();
  const deleteMutation = useDeleteWaSettingsMutation();
  const handleSubmit = (values: any) => {
    upsertMutation.mutate(values);
  };
  const handleDelete = () => {
    deleteMutation.mutate();
  };
  const { translations } = useTranslations();
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/api${WHATSAPP_URL}/webhook`;
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
              label={translations["WABA ID"]}
              placeholder={
                translations["Enter your Whatsapp Business Account ID"]
              }
              {...form.getInputProps("wabaId")}
              required
            />
            <ContainedTextField
              label={translations["Phone ID"]}
              placeholder={translations["Enter your phone ID"]}
              required
              {...form.getInputProps("phoneId")}
            />
            <ContainedTextField
              label={translations["App Id"]}
              placeholder={translations["Enter your app ID"]}
              required
              {...form.getInputProps("appId")}
            />
            <ContainedTextArea
              label={translations["Access Token"]}
              placeholder={translations["Enter your access token"]}
              autosize
              minRows={2}
              maxRows={4}
              required
              {...form.getInputProps("accessToken")}
            />
            <ContainedTextField
              label={translations["Webhook Password"]}
              placeholder={translations["Create a webhook password"]}
              required
              {...form.getInputProps("webhookPassword")}
            />
            <Group justify={"space-between"}>
              <Button
                color="red"
                variant="outline"
                leftSection={<IconTrash />}
                onClick={handleDelete}
                radius="lg"
                disabled={!waSettings}
              >
                {translations["Delete Configuration"]}
              </Button>
              <RateupButtonPrimary
                type="submit"
                title={translations["Save Changes"]}
              />
            </Group>
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
              <Text>{translations["Webhook URL"]}</Text>
              <Tooltip
                label={
                  translations[
                    "Paste this url in your facebook app under whatsapp configuration @developers.facebook.com/apps/"
                  ]
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
  const { translations } = useTranslations();
  return (
    <Button
      onClick={login}
      color={"#1877f2"}
      size={"lg"}
      loading={registerMutation.isPending}
    >
      {translations["Login with Facebook"]}
    </Button>
  );
}

export default function WhatsAppSettingsPage() {
  const { data: waSettings, isLoading } = useWaSettings();
  const [tab, setTab] = useState<WaConfigType>(WaConfigType.Automated);
  const { translations } = useTranslations();
  useEffect(() => {
    if (waSettings) {
      setTab(waSettings.type);
    }
  }, [waSettings]);

  if (isLoading) {
    return <MetaLoginStatusLoaderSkeleton />;
  }

  const isAutomated = waSettings?.type === WaConfigType.Automated;
  const isManual = waSettings?.type === WaConfigType.Manual;

  return (
    <Stack h={"100%"}>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        crossOrigin="anonymous"
      ></Script>
      <StyledTabs value={tab} onChange={setTab as any}>
        <Flex className={styles.headerContainer} mb={"sm"}>
          <h2>{translations["WhatsApp Settings"]}</h2>
          <Center pr={"xl"}>
            <Tabs.List>
              <Tooltip
                label={
                  isManual
                    ? translations[
                        "You need to delete the manually configured details to switch to Automated Configuration"
                      ]
                    : translations["Automated Configuration"]
                }
                openDelay={300}
              >
                <Tabs.Tab value={WaConfigType.Automated} disabled={isManual}>
                  {translations["Automated"]}
                </Tabs.Tab>
              </Tooltip>
              <Tooltip
                label={
                  isAutomated
                    ? translations[
                        "You need to de-register from the automated onboarding through fb-login to switch to manual configuration"
                      ]
                    : translations[
                        "Manually Configure WhatsApp Business Account"
                      ]
                }
                openDelay={300}
              >
                <Tabs.Tab value={WaConfigType.Manual} disabled={isAutomated}>
                  {translations["Manual"]}
                </Tabs.Tab>
              </Tooltip>
            </Tabs.List>
          </Center>
          <div />
        </Flex>
        <Tabs.Panel value={WaConfigType.Automated}>
          <MetaLoginStatus waSettings={waSettings} />
        </Tabs.Panel>
        <Tabs.Panel value={WaConfigType.Manual}>
          <WhatsAppManualConfiguration waSettings={waSettings} />
        </Tabs.Panel>
      </StyledTabs>
    </Stack>
  );
}

function MetaLoginStatus({ waSettings }) {
  const deRegisterMutation = useDeregisterBusinessClientMutation();
  const [openDeleteConfirmation, { open, close }] = useDisclosure(false);
  const { translations } = useTranslations();
  function handleDeRegister() {
    deRegisterMutation.mutate();
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
              {translations["Linked WhatsApp Business Account"]}
            </Text>
            <Tooltip
              label={translations["Logout from WhatsApp Business Account"]}
            >
              <ActionIcon variant="subtle" color="red" onClick={open}>
                <IconLogout />
              </ActionIcon>
            </Tooltip>
            <ConfirmationModal
              forDeleteFunctionality
              deleteQuotion={
                translations[
                  "Are you sure you want to DeRegister from WhatsApp Business Account?"
                ]
              }
              opened={openDeleteConfirmation}
              onClose={close}
              onConfirm={handleDeRegister}
              confirmLabel={translations["DeRegister"]}
              headerLabel={translations["DeRegister WhatsApp Business Account"]}
              headerTitle={translations["Confirmation Dialog"]}
            />
          </Group>
          <Group gap={"xl"}>
            <ContainedTextField
              label={translations["WhatsApp Business ID"]}
              value={waSettings.wabaId}
              readOnly
            />
            <ContainedTextField
              label={translations["WhatsApp Phone Number"]}
              value={waSettings.phone}
              readOnly
            />
          </Group>
        </Stack>
      </PaperLayout>
    );
  } else {
    return (
      <Center
        h={"100%"}
        bg={"whitesmoke"}
        style={{
          borderRadius: "4px",
        }}
      >
        <MetaLoginButton />
      </Center>
    );
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
