"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";

import {
  IconArrowLeft,
  IconChartBar,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconMessageCircle,
  IconSettings,
  IconShare,
  IconUsers,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SurveyContext from "../../../../../context/SurveyContext";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
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
}: FlowPageHeaderProps) {
  const { survey } = useContext(EditFlowContext);
  const router = useRouter();

  const subtitle = survey?.description || "Customer Engagement";
  const isActive = true; // You can make this dynamic based on flow state

  return (
    <div className={styles["flow-page-header"]}>
      {/* Row 1: Back Button, Title, Badge, and Subtitle */}
      <div className={styles["header-row-1"]}>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className={styles["back-button"]}
        >
          <IconArrowLeft size={18} />
          <span className={styles["back-text"]}>Back</span>
        </Button>

        <div className={styles["title-section"]}>
          <div className={styles["title-row"]}>
            <h1 className={styles["flow-title"]}>{name}</h1>
            {isActive && (
              <Badge className={styles["status-badge"]}>Active</Badge>
            )}
          </div>
          <p className={styles["flow-subtitle"]}>{subtitle}</p>
        </div>

        {/* Preview Button - Only show in Edit tab */}
        {tab === FlowTabEnum.Edit && setPreviewOpened && (
          <Button
            variant="outline"
            onClick={() => setPreviewOpened(!previewOpened)}
            className={styles["preview-button"]}
          >
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
                <TabsTrigger
                  key={tabNameString}
                  value={tabNameString}
                  className={styles["tab"]}
                >
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
