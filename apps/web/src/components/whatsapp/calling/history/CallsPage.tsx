import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { presetRange } from "@/components/whatsapp/inbox/analytics/dateRangePresets.ts";
import DateRangeSelector from "@/components/whatsapp/inbox/analytics/DateRangeSelector.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import type { AnalyticsDateRange } from "@/types/api.ts";

import CallAnalyticsTab from "./CallAnalyticsTab.tsx";
import CallLogTab from "./CallLogTab.tsx";
import { FilterSelect } from "./FilterSelect.tsx";
import LiveCallsStrip from "./LiveCallsStrip.tsx";

const route = getRouteApi("/dashboard/inbox/calls/");

/** What both tabs are narrowed by. */
export interface CallsScope {
  from: Date;
  to: Date;
  phoneId?: string;
}

const ALL = "all";

/** Analytics → Calls: every voice call, and how calling is going. */
export default function CallsPage() {
  const { t } = useTranslation();
  const { tab } = route.useSearch();
  const navigate = route.useNavigate();
  const canSeeAnalytics = useCan("analytics.read");
  const { data: numbers = [] } = useWaSettings();

  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() => ({
    key: "last7days",
    range: presetRange("last7days"),
  }));
  const [phoneId, setPhoneId] = useState(ALL);

  const [from, to] = dateRange.range;
  const scope: CallsScope | null =
    from && to ? { from, to, phoneId: phoneId === ALL ? undefined : phoneId } : null;
  const current = tab === "analytics" && canSeeAnalytics ? "analytics" : "log";

  const numberOptions = [
    { value: ALL, label: t("All numbers") },
    ...numbers
      .filter((n) => n.phoneId)
      .map((n) => ({ value: n.phoneId, label: n.phoneDisplayName || n.phone })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        title={t("Calls")}
        description={t(
          "Every WhatsApp voice call your team took or made, and how calling is going.",
        )}
      />

      <LiveCallsStrip phoneId={phoneId === ALL ? undefined : phoneId} />

      <Tabs
        value={current}
        onValueChange={(next) =>
          void navigate({ search: { tab: next === "analytics" ? "analytics" : undefined } })
        }
        className="gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="log">{t("Call log")}</TabsTrigger>
            {canSeeAnalytics && <TabsTrigger value="analytics">{t("Analytics")}</TabsTrigger>}
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            {numberOptions.length > 2 && (
              <FilterSelect
                value={phoneId}
                onChange={setPhoneId}
                options={numberOptions}
                label={t("Number")}
              />
            )}
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {scope && (
          <>
            <TabsContent value="log">
              <CallLogTab scope={scope} />
            </TabsContent>
            {canSeeAnalytics && (
              <TabsContent value="analytics">
                <CallAnalyticsTab scope={scope} />
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
