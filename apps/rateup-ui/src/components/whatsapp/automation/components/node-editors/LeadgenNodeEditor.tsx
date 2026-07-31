// Extracted verbatim from `node-editor.tsx`. Behaviour is unchanged.

import { IconBrandFacebookFilled, IconCheck, IconRefresh } from "@tabler/icons-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import {
  useMetaAssets,
  useSubscribeFieldToPage,
  useSyncAdaccounts,
  useSyncAdsByadAccounts,
  useSyncFbPages,
  useSyncLeadgenFormQuestions,
  useSyncMetaLeadgenForms,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import type { LeadgenNodeData } from "../../types/node-types.ts";
import { ContainedSelection } from "../editor-ui.tsx";
import type { NodeComponentProps } from "./shared.tsx";

// LeadgenNode Component
export const LeadgenNodeEditor: React.FC<NodeComponentProps<"leadgenNode">> = ({
  nodeData,
  handleInputChange,
}) => {
  const typedData = nodeData as unknown as LeadgenNodeData;
  const params = useParams({
    strict: false,
  });
  const navigate = useNavigate();
  const flowbotId = params.flowbotId as string;
  const { data: waSettings, isLoading: isSettingsLoading } = useWaSettings();
  const { data, isPending } = useWaAutomatedReplyById(flowbotId);
  const waSetting =
    waSettings &&
    (waSettings.find((w) => w.phoneId === data?.whatsappSettingsPhoneId) ?? waSettings[0]);
  const waSettingsId = data && waSetting ? waSetting.id : "";
  const { data: metaAssets, isLoading } = useMetaAssets(waSettingsId);
  const subscribeFieldMut = useSubscribeFieldToPage(waSettingsId);
  const syncfbpageMut = useSyncFbPages(waSettingsId);
  const syncAdAccMut = useSyncAdaccounts(waSettingsId);
  const syncAdsMut = useSyncAdsByadAccounts(typedData?.adAccountId ?? "", waSettingsId);
  const syncformQuestionsMut = useSyncLeadgenFormQuestions(
    typedData?.leadgenFormId ?? "",
    waSettingsId,
  );
  const syncLeadgenFormsMut = useSyncMetaLeadgenForms(waSettingsId);

  const { pages, adAccounts, leadgenForms, ads, formQuestions } = useMemo(() => {
    type Option = { label: string; value: string };
    let pages: Option[] = [],
      adAccounts: Option[] = [],
      leadgenForms: Option[] = [],
      ads: Option[] = [],
      // `SelectField` normalises bare strings, so the keys go through as-is.
      formQuestions: string[] = [];
    if (metaAssets) {
      pages = metaAssets.pages.map((page) => ({
        label: page.name,
        value: page.id,
      }));
      adAccounts = metaAssets.adAccounts.map((adAccount) => ({
        label: adAccount.name,
        value: adAccount.id,
      }));
      leadgenForms = typedData.fbPageId
        ? metaAssets.leadgenForms
            .filter((f) => f.pageId === typedData.fbPageId)
            .map((form) => ({
              label: form.name,
              value: form.id,
            }))
        : [];
      ads = typedData.adAccountId
        ? (metaAssets.adAccounts
            .find((adacc) => adacc.id === typedData.adAccountId)
            ?.ads?.map((ad) => ({
              label: ad?.name,
              value: ad?.id,
            })) ?? [])
        : [];
      formQuestions =
        metaAssets.leadgenForms
          .find((form) => form.id === typedData?.leadgenFormId)
          ?.questions?.map((question) => question?.key) ?? [];
    }
    return { pages, adAccounts, leadgenForms, ads, formQuestions };
  }, [metaAssets, typedData.fbPageId, typedData?.adAccountId, typedData?.leadgenFormId]);

  function subscribeTolead() {
    if (!typedData?.fbPageId) {
      toast.error("Select a page");
      return;
    }
    if (!typedData?.pageAccessToken) {
      toast.error("Failed! Try deselecting and selecting page");
      return;
    }
    subscribeFieldMut.mutate({
      fbPageId: typedData?.fbPageId,
      pageAccessToken: typedData?.pageAccessToken,
      fields: ["leadgen"],
    });
  }
  const [isFieldSubscribed, setIsFieldSubscribed] = useState(false);

  useEffect(() => {
    if (typedData?.fbPageId && metaAssets) {
      const page = metaAssets.pages?.find((p) => p?.id === typedData?.fbPageId);
      if (page) {
        handleInputChange("pageAccessToken", page.access_token);
        if (page.subscribedFields.includes("leadgen")) {
          setIsFieldSubscribed(true);
        } else {
          setIsFieldSubscribed(false);
        }
      } else {
        setIsFieldSubscribed(false);
      }
    }
  }, [typedData?.fbPageId, metaAssets]);

  async function handleFbLogin() {
    localStorage.setItem("waSettingsId", waSetting?.id ?? "");
    localStorage.setItem("automationId", flowbotId);
    localStorage.setItem(
      "automationRouteBase",
      globalThis.location.pathname.includes("/dashboard/instagram/flowbots")
        ? "/dashboard/instagram/flowbots"
        : "/dashboard/whatsapp/flowbots",
    );

    const url = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${import.meta.env.VITE_META_APP_ID}&redirect_uri=${encodeURIComponent(`${import.meta.env.VITE_FRONTEND_URL}/auth/fb`)}&config_id=${import.meta.env.VITE_META_USER_CONFIG_ID}`;
    if (url) {
      navigate({
        to: url,
      });
    }
  }
  const pageAccessTokenByUser = useMemo(() => {
    if (metaAssets && typedData?.fbPageId) {
      const page = metaAssets.pages?.find((page) => page.id === typedData?.fbPageId);
      return page?.pageAccessTokenByUser;
    }
    return null;
  }, [typedData?.fbPageId, metaAssets]);

  useEffect(() => {
    if (typedData?.phoneField?.length && pageAccessTokenByUser) {
      handleInputChange("pageUserAccessToken", pageAccessTokenByUser);
    }
  }, [typedData?.phoneField, pageAccessTokenByUser]);

  if (isLoading || isPending || isSettingsLoading) return <RateupLoader />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-[3px]">
        <ContainedSelection
          data={pages}
          value={typedData?.fbPageId}
          label={"Select Page"}
          onChange={(value) => {
            handleInputChange("fbPageId", value);
          }}
          w={200}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() => syncfbpageMut.mutate()}
                disabled={syncfbpageMut.isPending}
              >
                {syncfbpageMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync pages if not found.</TooltipContent>
        </Tooltip>
      </div>
      {!isFieldSubscribed && (
        <Button className="w-full" onClick={subscribeTolead} disabled={subscribeFieldMut.isPending}>
          {subscribeFieldMut.isPending && <Spinner />}
          Subscribe to Lead
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={adAccounts}
          value={typedData?.adAccountId}
          onChange={(value) => handleInputChange("adAccountId", value)}
          w={200}
          label={"Select Ad account"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() => syncAdAccMut.mutate()}
                disabled={syncAdAccMut.isPending}
              >
                {syncAdAccMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync ad accounts if not found.</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={leadgenForms}
          onChange={(value) => handleInputChange("leadgenFormId", value)}
          value={typedData?.leadgenFormId}
          w={200}
          label={"Select Leadgen Form"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() =>
                  syncLeadgenFormsMut.mutate({
                    fbPageId: typedData?.fbPageId,
                    pageAccessToken: typedData?.pageAccessToken,
                  })
                }
                disabled={syncLeadgenFormsMut.isPending}
              >
                {syncLeadgenFormsMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync Leadgen Forms if not found.</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={ads}
          onChange={(_value, option) =>
            handleInputChange("ad", { id: option?.value, name: option?.label })
          }
          value={typedData?.ad?.id}
          w={200}
          label={"Select ad"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() => syncAdsMut.mutate()}
                disabled={syncAdsMut.isPending}
              >
                {syncAdsMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync Ads if not found.</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        <ContainedSelection
          data={formQuestions}
          onChange={(value) => handleInputChange("phoneField", value)}
          value={typedData?.phoneField}
          w={200}
          label={"Select phone question key"}
          nothingFoundMessage="nothing found"
          searchable
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                onClick={() =>
                  syncformQuestionsMut.mutate({
                    fbPageId: typedData?.fbPageId,
                    pageAccessToken: typedData?.pageAccessToken,
                  })
                }
                disabled={syncformQuestionsMut.isPending}
              >
                {syncformQuestionsMut.isPending ? <Spinner /> : <IconRefresh />}
              </Button>
            }
          />
          <TooltipContent>Sync form questions if not found.</TooltipContent>
        </Tooltip>
      </div>
      {typedData?.fbPageId?.length && !pageAccessTokenByUser && typedData?.phoneField?.length ? (
        <Button className="w-full" onClick={handleFbLogin}>
          <IconBrandFacebookFilled size={20} />
          Allow lead access
        </Button>
      ) : typedData?.phoneField?.length ? (
        <Badge
          variant="secondary"
          className="border-transparent bg-green-500/15 text-green-600 normal-case dark:text-green-400"
        >
          <IconCheck size={"1rem"} />
          Allowed Lead Access
        </Badge>
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Default Phone number</span>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          value={typedData?.phone}
          onChange={(value) => handleInputChange("phone", value)}
        />
      </div>
    </div>
  );
};
