import { MessageSquare, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import WaQuickReplySettings from "@/components/RichTextEditor/WaQuickReply/WaQuickReplySettings.tsx";

import InboxAutomation from "./InboxAutomation.tsx";

// import WaInboxPermissions from "../chatselect/permissions";

const InboxSettings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"quick_replies" | "automation">("quick_replies");

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full h-full overflow-hidden">
      {/* Page Header */}
      <div className="space-y-1 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("Inbox Settings")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Configure quick replies and automation rules for this inbox")}
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-border gap-6 shrink-0">
        <button
          onClick={() => setActiveTab("quick_replies")}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-all ${
            activeTab === "quick_replies"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t("Quick Replies")}
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-all ${
            activeTab === "automation"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          <Zap className="w-4 h-4" />
          {t("Automation")}
        </button>
      </div>

      {/* Tab content panels */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {/* {user?.role === UserRole.SUPADM && (
          <div className="rounded-md shadow-md border p-4 space-y-4 mb-6 shrink-0">
            <WaInboxPermissions />
          </div>
        )} */}
        {activeTab === "quick_replies" ? <WaQuickReplySettings /> : <InboxAutomation />}
      </div>
    </div>
  );
};

export default InboxSettings;
