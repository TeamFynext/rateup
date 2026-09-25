import { IconBolt, IconHash, IconMessage } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SECTION_TITLE } from "@/components/common/page-heading.tsx";
import WaQuickReplySettings from "@/components/RichTextEditor/WaQuickReply/WaQuickReplySettings.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import ConversationTagSettings from "./ConversationTagSettings.tsx";
import InboxAutomation from "./InboxAutomation.tsx";

/** Channel accounts are managed under Settings → Channels, so they have no tab here. */
const TABS = [
  { value: "automation", label: "Automation", icon: IconBolt },
  { value: "conversation_tags", label: "Conversation tags", icon: IconHash },
  { value: "quick_replies", label: "Quick replies", icon: IconMessage },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const InboxSettings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabValue>("automation");

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* ---- Header band ----
           Sits on the surface with a hairline under it, so the tab row reads as
           part of the page chrome rather than as content. */}
      <div className="shrink-0 border-b border-border bg-card px-7 py-4">
        <h1 className={SECTION_TITLE}>{t("Inbox Settings")}</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {t("Manage automation, conversation tags and quick replies.")}
        </p>

        {/* y is clipped explicitly: overflow-x alone makes y `auto` too, and each tab's
            hidden underline sits 5px below the row, which showed a vertical scrollbar. */}
        <div className="mt-3.5 overflow-x-auto overflow-y-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
            <TabsList>
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}>
                  <Icon />
                  {t(label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ---- Panel ---- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
        {activeTab === "conversation_tags" && <ConversationTagSettings />}
        {activeTab === "quick_replies" && <WaQuickReplySettings />}
        {activeTab === "automation" && <InboxAutomation />}
      </div>
    </div>
  );
};

export default InboxSettings;
