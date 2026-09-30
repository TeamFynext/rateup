import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import type { LogsView as SubView } from "../analyticsView.ts";
import type { AnalyticsFilters } from "../kit/filters.ts";
import { AuditLogs } from "../logs/audit-log/AuditLogs.tsx";
import { MessageLogs } from "../logs/MessageLogs.tsx";

export function LogsView({
  filters,
  log,
  onLogChange,
}: Readonly<{ filters: AnalyticsFilters; log: SubView; onLogChange: (log: SubView) => void }>) {
  const { t } = useTranslation();
  return (
    <Tabs
      value={log}
      onValueChange={(value) => {
        if (value === "messages" || value === "activity") onLogChange(value);
      }}
      className="gap-4"
    >
      <TabsList>
        <TabsTrigger value="messages">{t("Message logs")}</TabsTrigger>
        <TabsTrigger value="activity">{t("Team activity")}</TabsTrigger>
      </TabsList>
      <TabsContent value="messages">
        <MessageLogs filters={filters} />
      </TabsContent>
      <TabsContent value="activity">
        <AuditLogs dateRange={filters.dateRange} />
      </TabsContent>
    </Tabs>
  );
}
