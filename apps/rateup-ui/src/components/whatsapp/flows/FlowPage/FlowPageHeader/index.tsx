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
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import styles from "./FlowPageHeader.module.css";

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

  const isActive = true; // You can make this dynamic based on flow state

  return (
    <div className={styles["flow-page-header"]}>
      {/* Row 1: Back Button, Title, Badge, and Subtitle */}
      <div className={styles["header-row-1"]}>
        <BackLink to="/dashboard/whatsapp/flows" label={t("Flows")} />

        <div className={styles["title-section"]}>
          <div className={styles["title-row"]}>
            <h1 className={styles["flow-title"]}>{name}</h1>
            {isActive && <Badge className={styles["status-badge"]}>Active</Badge>}
          </div>
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

      {/* Row 2: Tabs Navigation */}
      <div className={styles["header-row-2"]}>
        <Tabs
          value={tab}
          defaultValue={FlowTabEnum.Edit}
          onValueChange={setTabState}
          className={styles["tabs-root"]}
        >
          <TabsList className={styles["tabs-list"]}>
            {Object.values(FlowTabEnum).map((tabNameString) => {
              const TabIcon = tabIcons[tabNameString];
              return (
                <TabsTrigger key={tabNameString} value={tabNameString} className={styles["tab"]}>
                  <TabIcon size={16} className="mr-2" />
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
