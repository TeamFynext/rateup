"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

import {
  ActionIcon,
  Box,
  Button,
  Center,
  Checkbox,
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
  IconArrowsLeftRight,
  IconBrandInstagram,
  IconBrandMeta,
  IconCheck,
  IconCopy,
  IconHelp,
  IconLogout,
  IconPencilMinus,
  IconRefresh,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  MetaLoginAssets,
  SubscriptionFeaturePathName,
  WaConfigType,
} from "@/types/enums";
import {
  useGetChatbotDetails,
  useUpdateChatbot,
} from "@/backend/chatbot/chatbot.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { WHATSAPP_URL } from "@/backend/whatsapp";
import {
  useDeleteWaSettingsMutation,
  useDeregisterBusinessClientMutation,
  useMetaAssets,
  useRegisterBusinessClientMutation,
  useSyncFbPages,
  useUpdateWaSettingsMutation,
  useUpsertWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import InfoButton from "@/components/Button/InfoButton";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "@/components/Button/RateupButtons";
import {
  ContainedSelection,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import PremiumFeature from "@/components/Premium/PremiumFeature";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import StyledTabs from "@/components/styled/StyledTabs/StyledTabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button as ShadButton } from "@/components/ui/button";
// shadcn imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { docsPath, SAVE_HOTKEY } from "@/utils/constants";
import { hasFeature } from "@/utils/subscription/subscription";

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
      const { teams, ...rest } = waSettings;
      form.setValues(rest);
    } else {
      form.reset();
    }
  }, [waSettings]);

  const upsertMutation = useUpsertWaSettingsMutation();
  const deleteMutation = useDeleteWaSettingsMutation();
  const handleSubmit = (values: any) => {
    let payload = { ...values };
    if (waSettings) {
      payload = { ...waSettings, ...values };
    }
    if ("teams" in payload) {
      delete payload.teams;
    }
    upsertMutation.mutate(payload);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(translations("Copied to clipboard"));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Configuration</CardTitle>
          <CardDescription>
            Configure your WhatsApp Business Account manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.onSubmit(handleSubmit)}
            onKeyDown={getHotkeyHandler([
              [SAVE_HOTKEY, (event: any) => form.onSubmit(handleSubmit)(event)],
            ])}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="phoneDisplayName">
                Channel Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phoneDisplayName"
                placeholder={translations(
                  "Enter a name to identify this WhatsApp channel",
                )}
                {...form.getInputProps("phoneDisplayName")}
              />
              {form.errors.phoneDisplayName && (
                <p className="text-sm text-red-500">
                  {form.errors.phoneDisplayName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wabaId">
                WABA ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="wabaId"
                placeholder={translations(
                  "Enter your Whatsapp Business Account ID",
                )}
                {...form.getInputProps("wabaId")}
              />
              {form.errors.wabaId && (
                <p className="text-sm text-red-500">{form.errors.wabaId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneId">
                Phone ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phoneId"
                placeholder={translations("Enter your phone ID")}
                {...form.getInputProps("phoneId")}
              />
              {form.errors.phoneId && (
                <p className="text-sm text-red-500">{form.errors.phoneId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appId">
                App ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="appId"
                placeholder={translations("Enter your app ID")}
                {...form.getInputProps("appId")}
              />
              {form.errors.appId && (
                <p className="text-sm text-red-500">{form.errors.appId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">
                Access Token <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="accessToken"
                placeholder={translations("Enter your access token")}
                rows={3}
                {...form.getInputProps("accessToken")}
              />
              {form.errors.accessToken && (
                <p className="text-sm text-red-500">
                  {form.errors.accessToken}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookPassword">
                Webhook Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="webhookPassword"
                type="password"
                placeholder={translations("Create a webhook password")}
                {...form.getInputProps("webhookPassword")}
              />
              {form.errors.webhookPassword && (
                <p className="text-sm text-red-500">
                  {form.errors.webhookPassword}
                </p>
              )}
            </div>

            {waSettings?.accessToken && (
              <Skeleton visible={isLoading}>
                <div className="space-y-2">
                  <Label htmlFor="fbPageId">
                    Instagram Connected Facebook Page
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.values.fbPageId || ""}
                      onValueChange={(value) => {
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
                          return toast.error(
                            "Instagram account not found. Try after syncing page or choose another page",
                          );
                        }
                        form.setValues({
                          ...form.values,
                          fbPageId: page.id,
                          pageAccessToken: page.access_token,
                          ibaId: page.instagram_business_account?.id,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Facebook page" />
                      </SelectTrigger>
                      <SelectContent>
                        {fbPages.map((page) => (
                          <SelectItem key={page.value} value={page.value}>
                            {page.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ShadButton
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => syncfbpageMut.mutate()}
                      disabled={syncfbpageMut.isPending}
                    >
                      <IconRefresh
                        size={18}
                        className={
                          syncfbpageMut.isPending ? "animate-spin" : ""
                        }
                      />
                    </ShadButton>
                  </div>
                </div>
              </Skeleton>
            )}

            <div className="flex justify-between pt-4">
              <ShadButton
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={!waSettings}
              >
                <IconTrash size={18} className="mr-2" />
                {translations("Delete Configuration")}
              </ShadButton>
              <ShadButton type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending
                  ? "Saving"
                  : translations("Save Changes")}
              </ShadButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Webhook Information */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Webhook Configuration
              <Tooltip
                label={translations(
                  "Paste this url in your facebook app under whatsapp configuration @developers.facebook.com/apps/",
                )}
              >
                <IconHelp size={18} className="text-gray-500 cursor-help" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WhatsApp Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="flex-1" />
                <ShadButton
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <IconCopy size={18} />
                </ShadButton>
              </div>
            </div>

            {waSettings?.fbPageId && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Instagram Webhook URL
                  <Tooltip label="Paste this url in your facebook app under webhook -> instagram product configuration @developers.facebook.com/apps/">
                    <IconHelp size={18} className="text-gray-500 cursor-help" />
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Input readOnly value={instaWebhhokUrl} className="flex-1" />
                  <ShadButton
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(instaWebhhokUrl)}
                  >
                    <IconCopy size={18} />
                  </ShadButton>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            <strong>Note:</strong> Make sure to configure the webhook in your
            Facebook App settings with the URL provided above.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

const initFacebookSdk = () => {
  return new Promise((resolve, reject) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
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
          sessionInfoVersion: "4",
        },
      },
    );
  });
};

function MetaLoginButton({
  disabled = false,
  configId = null,
  selectedAssets,
}) {
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
        assets: selectedAssets,
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
            toast.warning("Meta login cancelled at " + current_step);
          } else if (data.event === "ERROR") {
            const { error_message } = data.data;
            setWData({ phone_number_id: "", waba_id: "" });
            setCode("");
            toast.error(JSON.stringify(error_message));
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
        toast.error("Error in meta login, Try again later");
      }
    } else if (response.status === "not_authorized") {
      toast.error("Not authorized");
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
        radius={"sm"}
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
          <MetaLoginButton
            disabled={!!error}
            configId={configId}
            selectedAssets={selectedAssets}
          />
        </Stack>
      </Modal>
    </>
  );
}

export default function WhatsAppSettingsPage() {
  const { data: waSettings, isLoading } = useWaSettings();
  const [tab, setTab] = useState<string>(WaConfigType.Automated);
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
        {" "}
        <Flex justify="space-between" align="center" mb="xs">
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
          <InfoButton docUrl={`${docsPath}/whatsapp/settings`} />
        </Flex>
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

const WaSettingEditModal = ({ opened, close, waSetting }) => {
  const updatemut = useUpdateWaSettingsMutation(waSetting?.id);
  const form = useForm({
    initialValues: {
      phoneDisplayName: waSetting?.phoneDisplaName || "",
      igDisplayName: waSetting?.igDisplaName || "",
    },
  });
  function handleSubmit() {
    updatemut.mutate(form.values, {
      onSuccess: () => {
        close();
      },
    });
  }
  if (!waSetting) return;
  return (
    <FormModalLayout
      centered
      isLoading={updatemut.isPending}
      customHeader={<Text>Edit Configuration</Text>}
      title=""
      buttonTitle="save"
      includeCancelButton
      cancelOnClick={close}
      opened={opened}
      onClose={close}
      onSubmit={handleSubmit}
    >
      <Stack>
        <ContainedTextField
          {...form.getInputProps("phoneDisplayName")}
          label={"Display name for whatsapp phone number"}
        />
        {waSetting.ibaId?.length ? (
          <ContainedTextField
            {...form.getInputProps("igDisplayName")}
            label={"Display name for instagram account"}
          />
        ) : null}
      </Stack>
    </FormModalLayout>
  );
};

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
  const [openedEdit, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);

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
    const { data: metaAssets, isLoading } = useMetaAssets(
      selectedWaSettings?.id,
    );
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
    if (!selectedWaSettings) return null;
    const { id, teams, ...rest } = selectedWaSettings;
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
                    toast.error(
                      "Instagram account not found.Try after syncing page or choose another page",
                    );
                    return;
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
              title={
                selectedWaSettings?.fbPageId?.length && !config?.fbPageId
                  ? "Disconnect"
                  : "connect"
              }
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
                  return toast.warning("Please select a page");
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
              <Flex justify={"flex-end"}>
                <ActionIcon
                  onClick={() => {
                    setSelectedWaSettings(setting);
                    openEdit();
                  }}
                  variant={"subtle"}
                >
                  <IconPencilMinus />
                </ActionIcon>
              </Flex>
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
                    <ContainedTextField
                      label={translations("Display Name")}
                      value={setting.phoneDisplayName}
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
                <Group>
                  {setting?.ibaId?.length ? (
                    <Group>
                      <ContainedTextField
                        label={"Instagram User Name"}
                        value={`@${setting?.igUserName}`}
                        readOnly
                        rightSection={
                          <Tooltip label={"Change Account"}>
                            <ActionIcon
                              variant="light"
                              mr={3}
                              onClick={() => {
                                setSelectedWaSettings(setting);
                                openInstaConfigModal();
                              }}
                            >
                              <Group gap={0}>
                                <IconUser size={13} />
                                <IconArrowsLeftRight size={13} />
                              </Group>
                            </ActionIcon>
                          </Tooltip>
                        }
                      />
                      <ContainedTextField
                        label={"Instagram Display Name"}
                        value={setting?.igDisplayName}
                        readOnly
                      />
                    </Group>
                  ) : (
                    <RateupButtonBlue
                      w={"fit-content"}
                      title={"Connect Instagram"}
                      variant="gradient"
                      gradient={{ from: "#f09433", to: "#bc1888", deg: 45 }}
                      radius={"md"}
                      leftIcon={<IconBrandInstagram />}
                      onClick={() => {
                        setSelectedWaSettings(setting);
                        openInstaConfigModal();
                      }}
                    />
                  )}
                </Group>
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
          <WaSettingEditModal
            opened={openedEdit}
            close={closeEdit}
            waSetting={selectedWaSettings}
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
