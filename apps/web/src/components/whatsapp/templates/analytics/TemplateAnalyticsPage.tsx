import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import {
  IconCircleCheck,
  IconClick,
  IconEye,
  IconFileText,
  IconReceipt,
  IconSend,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useTemplateAnalytics } from "@/backend/whatsapp/templateAnalytics.query";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { StatTile } from "@/components/common/StatTile.tsx";
import { AnalyticsCard } from "@/components/dashboard/analytics/kit/AnalyticsCard.tsx";
import { BarList } from "@/components/dashboard/analytics/kit/BarList.tsx";
import { TrendArea } from "@/components/dashboard/analytics/kit/charts.tsx";
import { formatBucket, formatCount } from "@/components/dashboard/analytics/kit/format.ts";
import { DotBadge } from "@/components/dashboard/analytics/kit/StatusBadges.tsx";
import { TileGroup } from "@/components/dashboard/analytics/kit/TileGroup.tsx";

import { EnableTemplateAnalytics } from "./EnableTemplateAnalytics.tsx";

const RANGES = [7, 30, 90] as const;

const readRate = (row: { read: number; delivered: number }) =>
  row.delivered > 0 ? Math.round((row.read / row.delivered) * 100) : null;
const ICON = "size-4 text-muted-foreground";

/** Meta's per-template numbers for one template: tiles, a daily chart, and clicks per button. */
export function TemplateAnalyticsPage({ templateId }: Readonly<{ templateId: string }>) {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(30);
  const templateQuery = useWaTemplateById(templateId);
  const template = templateQuery.data as WaTemplateListEntry | undefined;
  const phoneId = template?.whatsappSettingsPhoneId ?? null;
  const reachedMeta = !!template?.data?.id && template.data.status !== "DRAFT";

  const query = useTemplateAnalytics(
    phoneId && reachedMeta ? { phoneId, templateIds: [templateId], days } : null,
  );
  const stats = query.data?.templates[0];
  const hasCost = stats?.amountSpent !== null && stats?.amountSpent !== undefined;
  const rate = stats ? readRate(stats) : null;
  const deliveredRate =
    stats && stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : null;

  const back = (
    <div className="flex items-center gap-2">
      <BackLink to="/dashboard/whatsapp/templates" label={t("Templates")} />
      <Button
        size="sm"
        variant="outline"
        render={<Link to="/dashboard/whatsapp/templates/$templateId" params={{ templateId }} />}
      >
        <IconFileText className="size-4" aria-hidden />
        {t("Open template")}
      </Button>
    </div>
  );

  if (templateQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        title={template?.data?.name ?? t("Template analytics")}
        description={t("Numbers from Meta for this template.")}
        actions={back}
      />

      {!reachedMeta ? (
        <Alert>
          <AlertDescription>
            {t("This template hasn't been submitted to Meta yet, so there's nothing to show.")}
          </AlertDescription>
        </Alert>
      ) : query.data?.status === "disabled" && phoneId ? (
        <EnableTemplateAnalytics
          phoneId={phoneId}
          accountName={template?.WhatsappSettings?.phoneDisplayName}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <TabsList>
                {RANGES.map((range) => (
                  <TabsTrigger key={range} value={String(range)}>
                    {t("{count} days", { count: range })}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {query.data && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Meta never lets this be turned off, so there is no switch, only the state. */}
                {query.data.status === "enabled" && (
                  <span
                    title={t(
                      "Meta's template analytics are on for this WhatsApp number. Meta doesn't allow turning them off.",
                    )}
                  >
                    <DotBadge
                      dotClassName="bg-green-600 dark:bg-green-500"
                      label={t("Analytics on")}
                    />
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("{from} to {to}, UTC", { from: query.data.from, to: query.data.to })}
                </p>
              </div>
            )}
          </div>

          <TileGroup query={query} count={hasCost ? 5 : 4} columns={hasCost ? 5 : 4}>
            <StatTile
              label={t("Sent")}
              value={formatCount(stats?.sent)}
              icon={<IconSend className={ICON} />}
            />
            <StatTile
              label={t("Delivered")}
              value={deliveredRate === null ? null : `${deliveredRate}%`}
              emptyValue={t("Nothing sent")}
              note={t("{count} messages", { count: formatCount(stats?.delivered) })}
              icon={<IconCircleCheck className={ICON} />}
            />
            <StatTile
              label={t("Read")}
              value={rate === null ? null : `${rate}%`}
              emptyValue={t("Nothing delivered")}
              note={t("{count} messages", { count: formatCount(stats?.read) })}
              icon={<IconEye className={ICON} />}
            />
            <StatTile
              label={t("Button clicks")}
              value={formatCount(stats?.clicks)}
              icon={<IconClick className={ICON} />}
            />
            {stats?.amountSpent !== null && stats?.amountSpent !== undefined && (
              <StatTile
                label={t("Spent")}
                value={stats.amountSpent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                note={t("In your WhatsApp account's currency")}
                icon={<IconReceipt className={ICON} />}
              />
            )}
          </TileGroup>

          <AnalyticsCard
            title={t("Sent per day")}
            description={t("Template messages Meta sent each day")}
            query={query}
            isEmpty={!stats || stats.daily.every((d) => d.sent === 0)}
            emptyTitle={t("Not sent in this range")}
            emptyDescription={t("Try a longer date range.")}
          >
            <TrendArea
              data={stats?.daily ?? []}
              xKey="date"
              yKey="sent"
              label={t("Sent")}
              formatX={(value) => formatBucket(value, "day")}
            />
          </AnalyticsCard>

          <AnalyticsCard
            title={t("Clicks per button")}
            description={t("Marketing and utility templates only")}
            query={query}
            isEmpty={!stats || stats.buttons.length === 0}
            emptyTitle={t("No button clicks in this range")}
            emptyDescription={t("Try a longer date range.")}
          >
            <BarList
              items={(stats?.buttons ?? []).map((button) => ({
                key: `${button.type}:${button.button}`,
                label: button.button || t("Button"),
                secondary:
                  button.type === "url"
                    ? button.uniqueClicks !== null
                      ? t("Website · {count} people", { count: button.uniqueClicks })
                      : t("Website")
                    : button.type === "quick_reply"
                      ? t("Quick reply")
                      : undefined,
                value: button.clicks,
              }))}
            />
          </AnalyticsCard>

          <p className="text-xs text-muted-foreground">
            {t(
              "Meta keeps read and click counts for 7 days after a message is sent, so older days can show sends without reads or clicks.",
            )}
          </p>
        </>
      )}
    </div>
  );
}
