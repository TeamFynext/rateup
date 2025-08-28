import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

import {
  ActionIcon,
  Box,
  Button,
  Center,
  Checkbox,
  CopyButton,
  Divider,
  Flex,
  Group,
  Modal,
  Skeleton,
  Stack,
  Switch,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import {
  IconBrandInstagram,
  IconBrandMeta,
  IconCheck,
  IconChecks,
  IconCopy,
  IconHelp,
  IconLogout,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useGetChatbotDetails,
  useUpdateChatbot,
} from "@/backend/chatbot/chatbot.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import PremiumFeature from "@/components/Premium/PremiumFeature";
import { showErrorToast, showWarnToast } from "@/utils/notifications";
import { hasFeature } from "@/utils/subscription/subscription";

import { WHATSAPP_URL } from "../../../backend/whatsapp";
import {
  useDeleteWaSettingsMutation,
  useDeregisterBusinessClientMutation,
  useMetaAssets,
  useRegisterBusinessClientMutation,
  useSyncFbPages,
  useUpsertWaSettingsMutation,
  useWaSettings,
} from "../../../backend/whatsapp/settings/waSettings.query";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "../../../components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import StyledTabs from "../../../components/styled/StyledTabs/StyledTabs";
import {
  MetaLoginAssets,
  SubscriptionFeaturePathName,
  WaConfigType,
} from "../../../types/enums";
import { SAVE_HOTKEY } from "../../../utils/constants";
import styles from "./settings.style.module.css";

function WhatsAppManualConfiguration({ waSettings }) {
  const { data: metaAssets, isLoading } = useMetaAssets(waSettings?.id);
  const syncfbpageMut = useSyncFbPages(waSettings?.id);
  const form = useForm({
    initialValues: {
      wabaId: "",
      phoneId: "",
      accessToken: "",
      webhookPassword: "",
      appId: "",
      fbPageId: "",
      ibaId: "",
      pageAccessToken: "",
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
    deleteMutation.mutate(waSettings?.phoneId);
  };
  const translations = useTranslations();
  const fbPages = metaAssets
    ? metaAssets.pages.map((page) => ({ value: page.id, label: page.name }))
    : [];
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/api${WHATSAPP_URL}/webhook`;
  const instaWebhhokUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/instagram/webhook`;
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
              label={"WABA ID"}
              placeholder={translations(
                "Enter your Whatsapp Business Account ID",
              )}
              {...form.getInputProps("wabaId")}
              required
            />
            <ContainedTextField
              label={translations("Phone ID")}
              placeholder={translations("Enter your phone ID")}
              required
              {...form.getInputProps("phoneId")}
            />
            <ContainedTextField
              label={translations("App Id")}
              placeholder={translations("Enter your app ID")}
              required
              {...form.getInputProps("appId")}
            />
            <ContainedTextArea
              label={translations("Access Token")}
              placeholder={translations("Enter your access token")}
              autosize
              minRows={2}
              maxRows={4}
              required
              {...form.getInputProps("accessToken")}
            />
            <ContainedTextField
              label={translations("Webhook Password")}
              placeholder={translations("Create a webhook password")}
              required
              {...form.getInputProps("webhookPassword")}
            />
            {waSettings?.accessToken && (
              <Skeleton visible={isLoading}>
                <Group gap={"xs"}>
                  <ContainedSelection
                    data={fbPages}
                    value={form.values.fbPageId}
                    label={"Instagram Connected Facebook Page"}
                    onChange={(value) => {
                      if (!value) {
                        form.setFieldValue("fbPageId", null);
                        form.setFieldValue("pageAccessToken", null);
                        form.setFieldValue("ibaId", null);
                        return;
                      }
                      const page = metaAssets.pages.find(
                        (page) => page.id === value,
                      );
                      if (!page.instagram_business_account) {
                        return showErrorToast(
                          "Instagram account not found.Try after syncing page or choose another page",
                        );
                      }
                      form.setValues({
                        ...form.values,
                        fbPageId: page.id,
                        pageAccessToken: page.access_token,
                        ibaId: page.instagram_business_account?.id,
                      });
                    }}
                  />
                  <Tooltip label={"Sync FB pages"}>
                    <ActionIcon
                      variant="light"
                      mt={20}
                      onClick={() => syncfbpageMut.mutate()}
                      loading={syncfbpageMut.isPending}
                    >
                      <IconRefresh size={20} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Skeleton>
            )}
            <Group justify={"space-between"}>
              <Button
                color="red"
                variant="outline"
                leftSection={<IconTrash />}
                onClick={handleDelete}
                radius="lg"
                disabled={!waSettings}
              >
                {translations("Delete Configuration")}
              </Button>
              <RateupButtonPrimary
                type="submit"
                title={translations("Save Changes")}
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
              <Text>{translations("Webhook URL")}</Text>
              <Tooltip
                label={translations(
                  "Paste this url in your facebook app under whatsapp configuration @developers.facebook.com/apps/",
                )}
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
          {waSettings?.fbPageId && (
            <Box>
              <Group>
                <Text>Instagram Webhook URL</Text>
                <Tooltip
                  label={
                    "Paste this url in your facebook app under webhook -> instagram product configuration @developers.facebook.com/apps/"
                  }
                >
                  <ActionIcon variant="transparent" color="gray">
                    <IconHelp />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <ContainedTextField
                readOnly
                value={instaWebhhokUrl}
                rightSection={
                  <CopyButton value={instaWebhhokUrl}>
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
          )}
        </Stack>
      </Flex>
    </>
  );
}

const initFacebookSdk = () => {
  return new Promise((resolve, reject) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v23.0",
      });
    };
  });
};

const fbLogin = (configId = null): Promise<FBLoginResponse> => {
  return new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        resolve(response);
      },
      {
        config_id: configId ?? process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: "code", // must be set to 'code' for System User access token
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding", // set to 'whatsapp_business_app_onboarding'
          sessionInfoVersion: "3",
        },
      },
    );
  });
};

function MetaLoginButton({ disabled = false, configId = null }) {
  const [waData, setWData] = useState({
    phone_number_id: "",
    waba_id: "",
  });
  const [code, setCode] = useState("");
  const registerMutation = useRegisterBusinessClientMutation(() => {
    setWData({ phone_number_id: "", waba_id: "" });
    setCode("");
  });
  const translations = useTranslations();

  useEffect(() => {
    if (waData?.waba_id && code) {
      registerMutation.mutate({
        code,
        phone_number_id: waData.phone_number_id,
        waba_id: waData.waba_id,
      });
    }
  }, [waData, code]);

  useEffect(() => {
    // initFacebookSdk();

    const handleMessage = (event) => {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (
            ["FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", "FINISH"].includes(
              data.event,
            )
          ) {
            setWData({
              phone_number_id: data.data?.phone_number_id ?? "",
              waba_id: data?.data?.waba_id,
            });
          } else if (data.event === "CANCEL") {
            const { current_step } = data.data;
            setWData({ phone_number_id: "", waba_id: "" });
            setCode("");
            showWarnToast("Meta login cancelled at " + current_step);
          } else if (data.event === "ERROR") {
            const { error_message } = data.data;
            setWData({ phone_number_id: "", waba_id: "" });
            setCode("");
            showErrorToast(JSON.stringify(error_message));
          }
        }
      } catch {
        console.log("Error in parsing response");
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  async function login() {
    const response = await fbLogin(configId);
    if (response.authResponse) {
      const code = response.authResponse.code;
      if (code) {
        setCode(code);
      } else {
        setCode("");
        showErrorToast("Error in meta login, Try again later");
      }
    } else if (response.status === "not_authorized") {
      showErrorToast("Not authorized");
    }
  }
  return (
    // dont change the style of this button this is the requirement from facebook
    <Button
      onClick={login}
      style={{
        backgroundColor: "#1877f2",
        border: 0,
        borderRadius: "4px",
        color: "#fff",
        cursor: "pointer",
        fontFamily: "Helvetica, Arial, sans-serif",
        fontSize: "16px",
        fontWeight: "bold",
        height: "40px",
        padding: "0 24px",
      }}
      loading={registerMutation.isPending}
      disabled={disabled}
    >
      {translations("Login with Facebook")}
    </Button>
  );
}

function ConnectMetaAccountButton() {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([
    MetaLoginAssets.WHATSAPP,
  ]);

  useEffect(() => {
    initFacebookSdk();
  }, []);

  const assets = Object.values(MetaLoginAssets);

  const configId = useMemo(() => {
    if (selectedAssets.length === 1) {
      return process.env.NEXT_PUBLIC_META_CONFIG_ID;
    }
    if (assets.every((a) => selectedAssets.includes(a))) {
      return process.env.NEXT_PUBLIC_META_CONFIG_ID_ALL;
    }
    if (
      selectedAssets.length === 2 &&
      selectedAssets.includes(MetaLoginAssets.CATALOGS)
    ) {
      return process.env.NEXT_PUBLIC_META_CONFIG_ID_WA_CG;
    }
    if (selectedAssets.length === 3) {
      if (selectedAssets.includes(MetaLoginAssets.ADACCOUNTS))
        return process.env.NEXT_PUBLIC_META_CONFIG_ID_WA_AD;
      if (selectedAssets.includes(MetaLoginAssets.INSTAGRAM))
        return process.env.NEXT_PUBLIC_META_CONFIG_ID_WA_IG;
    }
    if (selectedAssets.length === 4) {
      if (selectedAssets.includes(MetaLoginAssets.ADACCOUNTS)) {
        if (selectedAssets.includes(MetaLoginAssets.INSTAGRAM))
          return process.env.NEXT_PUBLIC_META_CONFIG_ID_WA_AD_IG;
        if (selectedAssets.includes(MetaLoginAssets.CATALOGS))
          return process.env.NEXT_PUBLIC_META_CONFIG_ID_WA_AD_CG;
      }
      return process.env.NEXT_PUBLIC_META_CONFIG_ID_WA_IG_CG;
    }
    return process.env.NEXT_PUBLIC_META_CONFIG_ID;
  }, [selectedAssets]);

  const error = useMemo(() => {
    if (
      (selectedAssets.includes(MetaLoginAssets.ADACCOUNTS) ||
        selectedAssets.includes(MetaLoginAssets.INSTAGRAM)) &&
      !selectedAssets.includes(MetaLoginAssets.PAGES)
    ) {
      return "Facebook Pages required";
    }
    return null;
  }, [selectedAssets]);

  return (
    <>
      <RateupButtonBlue
        title="Add Account"
        onClick={open}
        leftIcon={<IconBrandMeta />}
      />
      <Modal opened={opened} onClose={close} centered>
        <Stack>
          <Checkbox.Group
            defaultValue={[MetaLoginAssets.WHATSAPP]}
            label="Select assets you want to connect"
            withAsterisk
            value={selectedAssets}
            onChange={setSelectedAssets}
            error={error}
          >
            <Stack mt="xs">
              {assets.map((asset) => (
                <Checkbox
                  disabled={asset === MetaLoginAssets.WHATSAPP}
                  value={asset}
                  key={asset}
                  label={asset}
                  styles={{
                    label: {
                      textTransform: "capitalize",
                    },
                  }}
                />
              ))}
            </Stack>
          </Checkbox.Group>
          <MetaLoginButton disabled={!!error} configId={configId} />
        </Stack>
      </Modal>
    </>
  );
}

export default function WhatsAppSettingsPage() {
  const { data: waSettings, isLoading } = useWaSettings();
  const [tab, setTab] = useState<WaConfigType>(WaConfigType.Automated);
  const translations = useTranslations();
  useEffect(() => {
    if (waSettings) {
      setTab(waSettings?.[0]?.type);
    }
  }, [waSettings]);

  if (isLoading) {
    return <MetaLoginStatusLoaderSkeleton />;
  }

  const isAutomated = waSettings?.[0]?.type === WaConfigType.Automated;
  const isManual = waSettings?.[0]?.type === WaConfigType.Manual;

  return (
    <Stack h={"100%"}>
      <Script
        async
        defer
        src="https://connect.facebook.net/en_US/sdk.js"
        crossOrigin="anonymous"
      ></Script>
      <StyledTabs value={tab} onChange={setTab as any}>
        <Tabs.List mb={"xs"}>
          <Tooltip
            label={
              isManual
                ? translations(
                    "You need to delete the manually configured details to switch to Automated Configuration",
                  )
                : translations("Automated Configuration")
            }
            openDelay={300}
          >
            <Tabs.Tab value={WaConfigType.Automated} disabled={isManual}>
              {translations("Automated")}
            </Tabs.Tab>
          </Tooltip>
          <Tooltip
            label={
              isAutomated
                ? translations(
                    "You need to de-register from the automated onboarding through fb-login to switch to manual configuration",
                  )
                : translations("Manually Configure WhatsApp Business Account")
            }
            openDelay={300}
          >
            <Tabs.Tab value={WaConfigType.Manual} disabled={isAutomated}>
              {translations("Manual")}
            </Tabs.Tab>
          </Tooltip>
        </Tabs.List>

        <Tabs.Panel value={WaConfigType.Automated}>
          <MetaLoginStatus waSettings={waSettings} />
        </Tabs.Panel>
        <Tabs.Panel value={WaConfigType.Manual}>
          <WhatsAppManualConfiguration waSettings={waSettings?.[0]} />
        </Tabs.Panel>
      </StyledTabs>
    </Stack>
  );
}

function MetaLoginStatus({ waSettings }) {
  const deRegisterMutation = useDeregisterBusinessClientMutation();
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [openDeleteConfirmation, { open, close }] = useDisclosure(false);
  const translations = useTranslations();
  const [selectedWaSettings, setSelectedWaSettings] = useState(null);
  const [
    openedInstaConfigModal,
    { open: openInstaConfigModal, close: closeInstaConfigModal },
  ] = useDisclosure(false);

  function handleDeRegister() {
    console.log(
      "🚀 ~ handleDeRegister ~ selectedAccountId:",
      selectedAccountId,
    );
    deRegisterMutation.mutate(selectedAccountId);
    close();
  }

  const handleLogoutAccount = (accountId) => {
    setSelectedAccountId(accountId);
    open();
  };
  const InstagramConfigModal = ({ opened, close }) => {
    if (!selectedWaSettings) return null;
    const { data: metaAssets, isLoading } = useMetaAssets(
      selectedWaSettings?.id,
    );
    const { id, ...rest } = selectedWaSettings;
    const upsertMutation = useUpsertWaSettingsMutation();
    const syncfbpageMut = useSyncFbPages(selectedWaSettings?.id);
    const initialConfig = {
      fbPageId: null,
      pageAccessToken: null,
      ibaId: null,
    };
    const [config, setConfig] = useState(initialConfig);

    useEffect(() => {
      if (selectedWaSettings) {
        setConfig({
          fbPageId: selectedWaSettings.fbPageId,
          pageAccessToken: selectedWaSettings.pageAccessToken,
          ibaId: selectedWaSettings.ibaId,
        });
      }
    }, [selectedWaSettings]);

    const fbPages = metaAssets
      ? metaAssets.pages.map((page) => ({ value: page.id, label: page.name }))
      : [];
    return (
      <Modal
        opened={opened}
        title="Connected Instagram account - FB Page"
        centered
        onClose={close}
      >
        <Stack>
          <Skeleton visible={isLoading}>
            <Group gap={"xs"}>
              <ContainedSelection
                data={fbPages}
                value={config.fbPageId}
                placeholder="Select Page"
                nothingFoundMessage={"No Pages found"}
                label={"Instagram Connected Facebook Page"}
                onChange={(value) => {
                  if (!value) {
                    setConfig(initialConfig);
                    return;
                  }
                  const page = metaAssets.pages.find(
                    (page) => page.id === value,
                  );
                  if (!page.instagram_business_account) {
                    return showErrorToast(
                      "Instagram account not found.Try after syncing page or choose another page",
                    );
                  }
                  const data = {
                    fbPageId: page.id,
                    pageAccessToken: page.access_token,
                    ibaId: page.instagram_business_account?.id,
                  };
                  setConfig(data);
                }}
              />
              <Tooltip label={"Sync FB pages"}>
                <ActionIcon
                  variant="light"
                  mt={20}
                  onClick={() => syncfbpageMut.mutate()}
                  loading={syncfbpageMut.isPending}
                >
                  <IconRefresh size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Skeleton>
          <Flex justify={"flex-end"}>
            <RateupButtonBlue
              w={"fit-content"}
              title="connect"
              onClick={() => {
                const data = {
                  ...rest,
                  fbPageId: config.fbPageId,
                  ibaId: config.ibaId,
                  pageAccessToken: config.pageAccessToken,
                };
                if (
                  !selectedWaSettings.fbPageId?.length &&
                  !data.fbPageId?.length
                )
                  return showWarnToast("Please select a page");
                upsertMutation.mutate(data, {
                  onSuccess: () => {
                    close();
                  },
                });
              }}
              loading={upsertMutation.isPending}
            />
          </Flex>
        </Stack>
      </Modal>
    );
  };

  if (waSettings?.length > 0) {
    return (
      <PaperLayout w={"fit-content"} m={"md"}>
        <Stack>
          <Text
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
            }}
            c="dimmed"
          >
            {translations("Linked WhatsApp Business Account")}
          </Text>
          {waSettings.map((setting, index) => (
            <Box key={index} mb="md">
              <Divider
                mb="sm"
                label={`Setting ${index + 1}`}
                labelPosition="center"
              />
              <Stack w={"100%"}>
                <Group align="flex-end" justify="apart">
                  <Group gap={"xl"}>
                    <ContainedTextField
                      label={translations("WhatsApp Business ID")}
                      value={setting.wabaId}
                      readOnly
                    />
                    <ContainedTextField
                      label={translations("WhatsApp Phone Number")}
                      value={setting.phone}
                      readOnly
                    />
                  </Group>
                  <Tooltip label={"Logout from this WhatsApp Business Account"}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleLogoutAccount(setting.phoneId)}
                    >
                      <IconLogout />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <RateupButtonBlue
                  w={"fit-content"}
                  title={
                    setting?.igUserName?.length
                      ? `@${setting?.igUserName}`
                      : "Connect Instagram"
                  }
                  variant="gradient"
                  gradient={{ from: "#f09433", to: "#bc1888", deg: 45 }}
                  radius={"md"}
                  leftIcon={<IconBrandInstagram />}
                  onClick={() => {
                    setSelectedWaSettings(setting);
                    openInstaConfigModal();
                  }}
                />
              </Stack>
            </Box>
          ))}
          <ConfirmationModal
            forDeleteFunctionality
            deleteQuotion={translations(
              "Are you sure you want to DeRegister this WhatsApp Business Account?",
            )}
            opened={openDeleteConfirmation}
            onClose={close}
            onConfirm={handleDeRegister}
            confirmLabel={translations("DeRegister")}
            headerLabel={translations("DeRegister WhatsApp Business Account")}
            headerTitle={translations("Confirmation Dialog")}
          />
          <InstagramConfigModal
            opened={openedInstaConfigModal}
            close={closeInstaConfigModal}
          />

          <Divider my="md" label={"Add New Account"} labelPosition="center" />
          <Center>
            <ConnectMetaAccountButton />
          </Center>
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
        <Stack align="center" gap="md">
          <Text>{"No WhatsApp Business Accounts Connected"}</Text>
          <ConnectMetaAccountButton />
        </Stack>
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

export function WhatsAppAIChatConfiguration({ selectedChatbotId }) {
  const { data: chatbot, isLoading } = useGetChatbotDetails(selectedChatbotId);
  const translations = useTranslations();
  const updateChatbotdetMut = useUpdateChatbot();
  const { data: subscription } = useSubscription();

  const form = useForm({
    initialValues: {
      waCommand: "",
      waPrompt: "",
    },
  });

  function handleEnableWaAIChat(e) {
    updateChatbotdetMut.mutate({
      chatbotId: selectedChatbotId,
      data: {
        enableWaChat: e.currentTarget.checked,
      },
    });
  }

  useEffect(() => {
    if (chatbot) {
      const newValues = {
        waCommand: chatbot.waCommand ?? "",
        waPrompt: chatbot.waPrompt ?? "",
      };

      form.setInitialValues(newValues); // set new base values
      form.setValues(newValues); // explicitly reset to the new chatbot's values
    } else {
      form.setValues({
        waCommand: "",
        waPrompt: "",
      });
    }
  }, [chatbot?.id]);

  function handleSubmit() {
    updateChatbotdetMut.mutate({
      chatbotId: selectedChatbotId,
      data: form.values,
    });
  }

  const hasAIFeature = useMemo(
    () => hasFeature(subscription, SubscriptionFeaturePathName.AI),
    [subscription],
  );

  return (
    <Skeleton visible={isLoading}>
      <Stack p={0}>
        <PremiumFeature isSubscribed={hasAIFeature}>
          <PaperLayout>
            <Stack>
              <Text fw={500} c="var(--grey-color-6)">
                {translations("Configure WhatsApp with AI Chat")}
              </Text>
              <Switch
                label={translations("Enable AI Chat in WhatsApp")}
                checked={chatbot?.enableWaChat}
                onChange={handleEnableWaAIChat}
              />
              {chatbot?.enableWaChat && (
                <Stack w={"50%"}>
                  <Switch
                    label={"Enable AI Chat for All Messages"}
                    checked={chatbot?.enableAllWaChat}
                    onChange={(e) =>
                      updateChatbotdetMut.mutate({
                        chatbotId: selectedChatbotId,
                        data: {
                          enableAllWaChat: e.currentTarget.checked,
                        },
                      })
                    }
                  />
                  <Tooltip
                    disabled={!chatbot?.enableAllWaChat}
                    label={
                      "Disable AI Chat for All Messages for command based chat"
                    }
                  >
                    <ContainedTextField
                      label={translations("Bot Command")}
                      placeholder={"eg: @bot"}
                      {...form.getInputProps("waCommand")}
                      disabled={chatbot?.enableAllWaChat}
                    />
                  </Tooltip>
                  <ContainedTextArea
                    label={translations("Bot Prompt")}
                    {...form.getInputProps("waPrompt")}
                    rows={5}
                  />
                  <Group>
                    <RateupButtonPrimary
                      onClick={handleSubmit}
                      title="Save"
                      loading={updateChatbotdetMut.isPending}
                    />
                    <RateupButtonSecondary
                      onClick={() => form.reset()}
                      title="Cancel"
                    />
                  </Group>
                </Stack>
              )}
            </Stack>
          </PaperLayout>
        </PremiumFeature>
      </Stack>
    </Skeleton>
  );
}

export const SaveAndCancelIcons = ({
  onSubmit,
  onCancel,
  isPending,
  isChanging = false,
}) => {
  if (!isChanging) return null;
  return (
    <Group justify="center" align="center" mt={"lg"}>
      <ActionIcon
        radius={"xl"}
        loading={isPending}
        loaderProps={{ type: "oval" }}
        color={"var(--gift-green)"}
        onClick={onSubmit}
        style={{ border: "1px solid white" }}
      >
        <IconCheck size={"1rem"} stroke={3} />
      </ActionIcon>
      <ActionIcon radius={"xl"} color={"red"} onClick={onCancel}>
        <IconX size={"1rem"} stroke={3} />
      </ActionIcon>
    </Group>
  );
};
