import {
  IconBrandWhatsapp,
  IconChartBar,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconSettings,
  IconShare,
  IconUsers,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { usePushToWaMutation } from "@/backend/whatsapp/flow/flow.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import type { WaFlowStatus } from "@/types/enums.ts";

import WaFlowStatusBadge from "../../WaTemplateStatusBadge.tsx";

export enum FlowTabEnum {
  Edit = "Edit",
  Settings = "Settings",
  Share = "Share",
  Responses = "Responses",
  Analytics = "Analytics",
  TeamAnalytics = "Team Analytics",
}

interface FlowPageHeaderProps {
  name: string;
  status?: WaFlowStatus;
  tab: FlowTabEnum;
  setTabState: (tab: FlowTabEnum) => void;
  previewOpened?: boolean;
  setPreviewOpened?: (opened: boolean) => void;
  flowDbId?: string;
  phonePreview?: ReactNode;
}

const tabIcons = {
  [FlowTabEnum.Edit]: IconEdit,
  [FlowTabEnum.Settings]: IconSettings,
  [FlowTabEnum.Share]: IconShare,
  [FlowTabEnum.Responses]: IconFileText,
  [FlowTabEnum.Analytics]: IconChartBar,
  [FlowTabEnum.TeamAnalytics]: IconUsers,
};

function FlowPageHeader({
  name,
  status,
  tab,
  setTabState,
  previewOpened = false,
  setPreviewOpened,
  flowDbId,
  phonePreview,
}: Readonly<FlowPageHeaderProps>) {
  const { t } = useTranslation();
  const pushToWaMutation = usePushToWaMutation();

  const handleSaveToWhatsapp = () => {
    if (flowDbId) {
      pushToWaMutation.mutate(flowDbId);
    }
  };

  return (
    <div className="bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-2.5">
        <BackLink to="/dashboard/whatsapp/flows" label={t("Flows")} />

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="truncate font-display text-xl font-semibold tracking-tight text-foreground">
            {name}
          </h1>
          {status && <WaFlowStatusBadge status={status} />}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Save to WhatsApp Button - Visible in all tabs */}
          {flowDbId && (
            <Button onClick={handleSaveToWhatsapp} loading={pushToWaMutation.isPending}>
              <IconBrandWhatsapp size={16} className="mr-2" />
              {"Save to WhatsApp"}
            </Button>
          )}
          {/* Device Preview Button - Only show in Edit tab */}
          {tab === FlowTabEnum.Edit && phonePreview && (
            <PhonePreviewButton platform="whatsapp" label="Preview">
              {phonePreview}
            </PhonePreviewButton>
          )}
          {/* Legacy Preview Button - Only show in Edit tab */}
          {tab === FlowTabEnum.Edit && setPreviewOpened && (
            <Button variant="outline" onClick={() => setPreviewOpened(!previewOpened)}>
              {previewOpened ? (
                <>
                  <IconEyeOff size={16} className="mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <IconEye size={16} className="mr-2" />
                  Show Preview
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-2">
        <Tabs value={tab} defaultValue={FlowTabEnum.Edit} onValueChange={setTabState}>
          <TabsList>
            {Object.values(FlowTabEnum).map((tabNameString) => {
              const TabIcon = tabIcons[tabNameString];
              return (
                <TabsTrigger key={tabNameString} value={tabNameString}>
                  <TabIcon />
                  {tabNameString}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

export default FlowPageHeader;
