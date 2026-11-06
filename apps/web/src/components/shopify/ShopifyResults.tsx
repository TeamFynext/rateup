import { IconClick, IconCoin, IconReceipt, IconSend } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  RevenueByCurrency,
  ShopifyAttribution,
} from "@/backend/appsIntegration/shopify/shopify.api";
import { useShopifyAttribution } from "@/backend/appsIntegration/shopify/shopify.query";
import { StatTile } from "@/components/common/StatTile.tsx";
import { AnalyticsCard } from "@/components/dashboard/analytics/kit/AnalyticsCard.tsx";
import { BarList } from "@/components/dashboard/analytics/kit/BarList.tsx";
import { TrendBars } from "@/components/dashboard/analytics/kit/charts.tsx";
import { TileGroup } from "@/components/dashboard/analytics/kit/TileGroup.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const ICON = "size-4 text-muted-foreground";

/** Revenue per currency, e.g. "₹1,180" or "₹1,180 · $24". */
export function formatRevenue(revenue: RevenueByCurrency[]) {
  if (!revenue.length) return null;
  return revenue
    .map(({ currency, amount }) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(Number(amount));
      } catch {
        return `${currency} ${Math.round(Number(amount)).toLocaleString()}`;
      }
    })
    .join(" · ");
}

const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : "—";

/** The funnel as ranked bars: each step measured against the reminders that went out. */
function funnelItems(totals: ShopifyAttribution["totals"], t: (key: string) => string) {
  const steps = [
    { key: "sent", label: t("Sent"), value: totals.sent },
    { key: "delivered", label: t("Delivered"), value: totals.delivered },
    { key: "read", label: t("Read"), value: totals.read },
    { key: "clicked", label: t("Opened the cart link"), value: totals.clicked },
    { key: "recovered", label: t("Completed the order"), value: totals.recovered },
  ];
  return steps.map((step) => ({
    ...step,
    display: `${step.value.toLocaleString()} · ${percent(step.value, totals.sent)}`,
  }));
}

/** What abandoned-cart reminders brought back: orders and revenue credited to WhatsApp. */
export default function ShopifyResults() {
  const { t } = useTranslation();
  const [days, setDays] = useState("30");
  const query = useShopifyAttribution(Number(days));
  const report = query.data;
  const totals = report?.totals;

  const primaryCurrency = totals?.revenue[0]?.currency;
  const daily = (report?.byDay ?? []).map((day) => ({
    day: day.day,
    revenue: Number(day.revenue.find((r) => r.currency === primaryCurrency)?.amount ?? 0),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          {t(
            "Orders completed after a cart reminder, counted for reminders sent in the period. Links in reminders are tagged utm_source=rateup, so Shopify's own reports credit WhatsApp too.",
          )}
        </p>
        <Select value={days} onValueChange={(value) => setDays(value ?? "30")} items={PERIODS}>
          <SelectTrigger className="w-40" aria-label={t("Period")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {t(period.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TileGroup query={query} count={4}>
        <StatTile
          label={t("Revenue recovered")}
          value={totals ? formatRevenue(totals.revenue) : null}
          emptyValue={t("No recovered orders yet")}
          icon={<IconCoin className={ICON} />}
        />
        <StatTile
          label={t("Orders recovered")}
          value={totals ? totals.recovered.toLocaleString() : null}
          note={
            totals?.recoveredWithoutReminder
              ? t("{count} more came back without a reminder", {
                  count: totals.recoveredWithoutReminder,
                })
              : undefined
          }
          icon={<IconReceipt className={ICON} />}
        />
        <StatTile
          label={t("Recovery rate")}
          value={totals ? percent(totals.recovered, totals.sent) : null}
          note={t("Of reminders sent")}
          icon={<IconSend className={ICON} />}
        />
        <StatTile
          label={t("Link click rate")}
          value={totals ? percent(totals.clicked, totals.sent) : null}
          note={
            totals?.failed
              ? t("{count} reminders failed to send", { count: totals.failed })
              : undefined
          }
          icon={<IconClick className={ICON} />}
        />
      </TileGroup>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsCard
          title={t("Reminder funnel")}
          description={t("From reminder to order, against reminders sent")}
          query={query}
          isEmpty={!totals?.sent}
          emptyTitle={t("No reminders sent in this period")}
          emptyDescription={t(
            "Reminders go out from your “On abandoned checkouts” automation rules.",
          )}
        >
          {totals && <BarList items={funnelItems(totals, t)} />}
        </AnalyticsCard>

        <AnalyticsCard
          title={t("Revenue by rule")}
          description={t("Which reminder brought each order back")}
          query={query}
          isEmpty={!report?.byRule.some((rule) => rule.sent)}
        >
          <BarList
            items={(report?.byRule ?? []).map((rule) => ({
              key: rule.ruleId,
              label: rule.ruleName,
              secondary: t("{recovered} of {sent} recovered", {
                recovered: rule.recovered,
                sent: rule.sent,
              }),
              value: Number(rule.revenue[0]?.amount ?? 0),
              display: formatRevenue(rule.revenue) ?? "—",
            }))}
          />
        </AnalyticsCard>
      </div>

      <AnalyticsCard
        title={t("Revenue recovered per day")}
        description={
          primaryCurrency
            ? t("By the day the reminder was sent, in {currency}", { currency: primaryCurrency })
            : t("By the day the reminder was sent")
        }
        query={query}
        isEmpty={!daily.some((day) => day.revenue)}
      >
        <TrendBars
          data={daily}
          xKey="day"
          yKey="revenue"
          label={t("Revenue")}
          formatX={(value) => dayjs(value).format("D MMM")}
          formatY={(value) =>
            formatRevenue([{ currency: primaryCurrency ?? "INR", amount: String(value) }]) ?? ""
          }
        />
      </AnalyticsCard>
    </div>
  );
}
