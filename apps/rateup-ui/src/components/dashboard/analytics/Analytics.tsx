import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { presetRange } from "@/components/whatsapp/inbox/analytics/dateRangePresets.ts";

import type { AnalyticsTab, ConversationsView as ConversationsSubView } from "./analyticsView.ts";
import { AnalyticsFilterBar } from "./kit/AnalyticsFilterBar.tsx";
import { AnalyticsHeader } from "./kit/AnalyticsHeader.tsx";
import type { AnalyticsFilters } from "./kit/filters.ts";
import { exportAnalyticsReport } from "./report/exportReport.ts";
import { ConversationsView } from "./views/ConversationsView.tsx";
import {
  type InstagramSelection,
  InstagramFilters,
  InstagramView,
} from "./views/InstagramView.tsx";
import { LogsView } from "./views/LogsView.tsx";
import { MessagesView } from "./views/MessagesView.tsx";
import { OverviewView } from "./views/OverviewView.tsx";

/**
 * `/dashboard/analytics`: five views under one filter bar. The filters live here, above
 * the views, so moving between views keeps the range and team that were picked.
 */
export function Analytics() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/dashboard/analytics/" });
  const navigate = useNavigate({ from: "/dashboard/analytics/" });
  const tab: AnalyticsTab = search.tab ?? "overview";
  const view: ConversationsSubView = search.view ?? "agents";
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFilters>(() => ({
    dateRange: { key: "last7days", range: presetRange("last7days") },
    teamId: "all",
    apiType: "all",
  }));
  // Instagram reads Graph's own windows (7/30/90 days), not the section's date range.
  const [instagram, setInstagram] = useState<InstagramSelection>({ range: "30d" });
  const hasReport = tab !== "message-log" && tab !== "instagram";

  const headings: Record<AnalyticsTab, { title: string; description: string }> = {
    overview: {
      title: t("Overview"),
      description: t("How your conversations and WhatsApp messages are doing"),
    },
    "team-performance": {
      title: t("Team Performance"),
      description: t("How fast each agent and team replies, and how much they handle"),
    },
    "template-delivery": {
      title: t("Template Delivery"),
      description: t("Whether your outbound WhatsApp messages are delivered, by template and team"),
    },
    "message-log": {
      title: t("Message log"),
      description: t("Every message sent, with its status and where it came from"),
    },
    instagram: {
      title: t("Instagram"),
      description: t(
        "Reach of your Instagram account, and which posts bring in DMs, leads and orders",
      ),
    },
  };
  const heading = headings[tab];

  async function exportPdf() {
    if (tab === "message-log" || tab === "instagram") return;
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
          dateRange: tab !== "instagram",
          team: tab !== "instagram",
          channelType: tab === "overview" || tab === "template-delivery",
        }}
        onExportPdf={hasReport ? exportPdf : undefined}
        isExporting={isExporting}
        controls={
          tab === "instagram" ? (
            <InstagramFilters value={instagram} onChange={setInstagram} />
          ) : undefined
        }
      />
      <div className="pt-1">
        {tab === "overview" && <OverviewView filters={filters} />}
        {tab === "team-performance" && (
          <ConversationsView
            filters={filters}
            view={view}
            onViewChange={(next) => navigate({ search: (prev) => ({ ...prev, view: next }) })}
          />
        )}
        {tab === "template-delivery" && <MessagesView filters={filters} />}
        {tab === "message-log" && <LogsView filters={filters} />}
        {tab === "instagram" && <InstagramView selection={instagram} />}
      </div>
    </div>
  );
}
