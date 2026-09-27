import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { presetRange } from "@/components/whatsapp/inbox/analytics/dateRangePresets.ts";

import type {
  AnalyticsTab,
  ConversationsView as ConversationsSubView,
  LogsView as LogsSubView,
} from "./analyticsView.ts";
import { AnalyticsFilterBar } from "./kit/AnalyticsFilterBar.tsx";
import { AnalyticsHeader } from "./kit/AnalyticsHeader.tsx";
import type { AnalyticsFilters } from "./kit/filters.ts";
import { exportAnalyticsReport } from "./report/exportReport.ts";
import { ConversationsView } from "./views/ConversationsView.tsx";
import { LogsView } from "./views/LogsView.tsx";
import { MessagesView } from "./views/MessagesView.tsx";
import { OverviewView } from "./views/OverviewView.tsx";

/**
 * `/dashboard/analytics`: four views under one filter bar. The filters live here, above
 * the views, so moving between views keeps the range and team that were picked.
 */
export function Analytics() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/dashboard/analytics/" });
  const navigate = useNavigate({ from: "/dashboard/analytics/" });
  const tab: AnalyticsTab = search.tab ?? "overview";
  const view: ConversationsSubView = search.view ?? "agents";
  const log: LogsSubView = search.log ?? "messages";
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFilters>(() => ({
    dateRange: { key: "last7days", range: presetRange("last7days") },
    teamId: "all",
    apiType: "all",
  }));

  const headings: Record<AnalyticsTab, { title: string; description: string }> = {
    overview: {
      title: t("Overview"),
      description: t("How your conversations and WhatsApp messages are doing"),
    },
    conversations: {
      title: t("Conversations"),
      description: t("How fast each agent and team replies, and how much they handle"),
    },
    messages: {
      title: t("Messages"),
      description: t("Whether your outbound WhatsApp messages are delivered, by template and team"),
    },
    logs: {
      title: t("Logs"),
      description: t("Every message sent and every change your team made"),
    },
  };
  const heading = headings[tab];

  async function exportPdf() {
    if (tab === "logs") return;
    setIsExporting(true);
    try {
      await exportAnalyticsReport(queryClient, tab, filters);
    } catch (error) {
      console.error(error);
      toast.error(t("The report could not be created. Try again in a moment."));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <AnalyticsHeader title={heading.title} description={heading.description} />
      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        show={{
          dateRange: true,
          team: !(tab === "logs" && log === "activity"),
          channelType: tab === "overview" || tab === "messages",
        }}
        onExportPdf={tab === "logs" ? undefined : exportPdf}
        isExporting={isExporting}
      />
      <div className="pt-1">
        {tab === "overview" && <OverviewView filters={filters} />}
        {tab === "conversations" && (
          <ConversationsView
            filters={filters}
            view={view}
            onViewChange={(next) => navigate({ search: (prev) => ({ ...prev, view: next }) })}
          />
        )}
        {tab === "messages" && <MessagesView filters={filters} />}
        {tab === "logs" && (
          <LogsView
            filters={filters}
            log={log}
            onLogChange={(next) => navigate({ search: (prev) => ({ ...prev, log: next }) })}
          />
        )}
      </div>
    </div>
  );
}
