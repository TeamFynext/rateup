import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { formatMoney, type ShopOverview } from "@/backend/commerce/shop.api";
import { useShopOverview, useShopStore } from "@/backend/commerce/shop.query";
import { BarList } from "@/components/dashboard/analytics/kit/BarList.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { useCommerce } from "../CommerceContext";
import { CommerceDateFilter } from "../CommerceFilters";
import { StoreDisconnectedAlert } from "../settings/StoreCheckoutNotice.tsx";
import { AdReportSection } from "../shop/AdReportSection.tsx";
import { MessageCostSection } from "../shop/MessageCostSection.tsx";
import { OrderAllowanceNotice } from "../shop/OrderLimit.tsx";
import {
  channelLabel,
  customerName,
  fulfillmentBadge,
  paymentBadge,
  SHOP_PATHS,
  signedPercent,
  type Tone,
} from "../shop/shopMeta.ts";
import { ShopPage, ShopSection, ToneBadge } from "../shop/ShopUi.tsx";

export function OverviewPage() {
  const { t } = useTranslation();
  const { dateRange } = useCommerce();
  const canEditProducts = useCan("commerce.products.manage");
  const range = {
    from: dateRange.range[0]?.toISOString(),
    to: dateRange.range[1]?.toISOString(),
  };
  const { data, isPending, isError, error } = useShopOverview(range);

  return (
    <ShopPage
      title={t("Overview")}
      description={t("Sales from every channel for the dates you pick.")}
      actions={
        <>
          <CommerceDateFilter />
          {canEditProducts && (
            <Button render={<Link to={SHOP_PATHS.newProduct} />}>
              <IconPlus data-icon="inline-start" />
              {t("Add product")}
            </Button>
          )}
        </>
      }
    >
      <OrderAllowanceNotice />
      {isPending ? (
        <OverviewSkeleton />
      ) : isError ? (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("Could not load the overview")}</EmptyTitle>
            <EmptyDescription>{getApiErrorMessage(error, t("Please try again."))}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <OverviewBody data={data} range={range} />
      )}
    </ShopPage>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

function OverviewBody({
  data,
  range,
}: Readonly<{ data: ShopOverview; range: { from?: string; to?: string } }>) {
  const { t } = useTranslation();
  const { data: store } = useShopStore();
  const currency = data.currency;
  const money = (n: number) => formatMoney(n, currency);
  return (
    <div className="flex flex-col gap-5">
      {store && <StoreDisconnectedAlert store={store} />}
      {data.setup.done < data.setup.total && <SetupBanner setup={data.setup} />}

      <section
        aria-label={t("Key numbers")}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiTile
          label={t("Revenue")}
          value={money(data.kpis.revenue.value)}
          change={
            data.kpis.revenue.change === null ? null : signedPercent(data.kpis.revenue.change)
          }
          up={(data.kpis.revenue.change ?? 0) >= 0}
        />
        <KpiTile
          label={t("Orders")}
          value={data.kpis.orders.value.toLocaleString()}
          change={data.kpis.orders.change === null ? null : signedPercent(data.kpis.orders.change)}
          up={(data.kpis.orders.change ?? 0) >= 0}
        />
        <KpiTile
          label={t("Chat to paid order")}
          value={`${data.kpis.conversion.value}%`}
          change={
            data.kpis.conversion.change === null
              ? null
              : t("{change} pts", { change: signedPercent(data.kpis.conversion.change, "") })
          }
          up={(data.kpis.conversion.change ?? 0) >= 0}
        />
        <KpiTile
          label={t("Recovered from cart reminders")}
          value={money(data.kpis.recovered.value)}
          change={null}
          up
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ShopSection
          title={t("Revenue")}
          description={t("Paid orders and carts recovered by a reminder, per day.")}
        >
          <RevenueChart series={data.series} currency={currency} />
        </ShopSection>
        <ShopSection title={t("Where orders come from")}>
          {data.channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No paid orders in this period.")}</p>
          ) : (
            <BarList
              items={data.channels.map((c) => ({
                key: c.channel,
                label: channelLabel(t, c.channel),
                secondary: t("{count, plural, one {# order} other {# orders}}", {
                  count: c.orders,
                }),
                value: c.revenue,
                display: money(c.revenue),
              }))}
            />
          )}
        </ShopSection>
      </div>

      <MessageCostSection range={range} />
      <AdReportSection range={range} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ShopSection
          title={t("Recent orders")}
          flush
          actions={
            <Button variant="link" size="sm" render={<Link to={SHOP_PATHS.orders} />}>
              {t("View all")}
              <IconArrowRight data-icon="inline-end" />
            </Button>
          }
        >
          <RecentOrders orders={data.recentOrders} />
        </ShopSection>
        <NeedsAttention attention={data.attention} currency={currency} />
      </div>
    </div>
  );
}

function SetupBanner({ setup }: Readonly<{ setup: ShopOverview["setup"] }>) {
  const { t } = useTranslation();
  return (
    <Card
      size="sm"
      className="flex-row flex-wrap items-center gap-4 bg-primary/5 px-5 ring-primary/15"
    >
      <span className="text-sm font-bold text-foreground">
        {t("Finish setup · {done}/{total}", { done: setup.done, total: setup.total })}
      </span>
      <Progress className="min-w-32 flex-1" value={(setup.done / Math.max(setup.total, 1)) * 100} />
      <Button size="sm" render={<Link to={SHOP_PATHS.setup} />}>
        {t("Continue setup")}
        <IconArrowRight data-icon="inline-end" />
      </Button>
    </Card>
  );
}

function KpiTile({
  label,
  value,
  change,
  up,
}: Readonly<{ label: string; value: string; change: string | null; up: boolean }>) {
  const { t } = useTranslation();
  return (
    <Card size="sm" className="gap-1 px-5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="font-display text-[28px] leading-9 font-bold tracking-tight text-foreground">
        {value}
      </span>
      <span className="text-[13px] text-muted-foreground">
        {change === null ? (
          t("In the selected dates")
        ) : (
          <>
            <span
              className={cn(
                "font-semibold",
                up ? "text-green-700 dark:text-green-400" : "text-destructive",
              )}
            >
              {change}
            </span>{" "}
            {t("vs the previous period")}
          </>
        )}
      </span>
    </Card>
  );
}

function RevenueChart({
  series,
  currency,
}: Readonly<{ series: ShopOverview["series"]; currency: string }>) {
  const { t } = useTranslation();
  if (series.every((d) => d.revenue === 0 && d.recovered === 0)) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        {t("No paid orders in this period.")}
      </div>
    );
  }
  // Paid and recovered are disjoint on the API side, so stacking them gives the day's total.
  const config: ChartConfig = {
    revenue: { label: t("Paid orders"), color: "var(--chart-2)" },
    recovered: { label: t("Recovered carts"), color: "var(--chart-5)" },
  };
  const compact = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return (
    <ChartContainer config={config} className="h-60 w-full">
      <BarChart data={series} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v: string) => dayjs(v).format("MMM D")}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => compact.format(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label: unknown) => dayjs(String(label)).format("MMM D")}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="revenue" stackId="paid" fill="var(--color-revenue)" maxBarSize={36} />
        <Bar
          dataKey="recovered"
          stackId="paid"
          fill="var(--color-recovered)"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
        />
      </BarChart>
    </ChartContainer>
  );
}

function RecentOrders({ orders }: Readonly<{ orders: ShopOverview["recentOrders"] }>) {
  const { t } = useTranslation();
  if (orders.length === 0) {
    return (
      <p className="px-6 pb-6 text-sm text-muted-foreground">{t("No orders in this period.")}</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">{t("Order")}</TableHead>
          <TableHead>{t("Customer")}</TableHead>
          <TableHead>{t("Channel")}</TableHead>
          <TableHead>{t("Total")}</TableHead>
          <TableHead>{t("Payment")}</TableHead>
          <TableHead className="pr-6">{t("Fulfillment")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => {
          const pay = paymentBadge(t, o.paymentStatus);
          const ful = fulfillmentBadge(t, o);
          return (
            <TableRow key={o.id}>
              <TableCell className="pl-6">
                <Link
                  to={SHOP_PATHS.order}
                  params={{ orderId: o.id }}
                  className="font-semibold text-primary hover:underline"
                >
                  #{o.number}
                </Link>
              </TableCell>
              <TableCell>{customerName(t, o.customerName)}</TableCell>
              <TableCell className="text-muted-foreground">{channelLabel(t, o.channel)}</TableCell>
              <TableCell className="font-semibold tabular-nums">
                {formatMoney(o.total, o.currency)}
              </TableCell>
              <TableCell>
                <ToneBadge tone={pay.tone}>{pay.label}</ToneBadge>
              </TableCell>
              <TableCell className="pr-6">
                <ToneBadge tone={ful.tone}>{ful.label}</ToneBadge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function NeedsAttention({
  attention,
  currency,
}: Readonly<{ attention: ShopOverview["attention"]; currency: string }>) {
  const { t } = useTranslation();
  const items: {
    key: string;
    tag: string;
    tone: Tone;
    title: ReactNode;
    detail: ReactNode;
    to: string;
    params?: Record<string, string>;
  }[] = [];

  for (const p of attention.lowStock) {
    items.push({
      key: `stock-${p.productId}`,
      tag: t("Stock"),
      tone: "warn",
      title: p.title,
      detail:
        p.waiting > 0
          ? t(
              "{stock} left · {waiting, plural, one {# person} other {# people}} waiting for a restock",
              {
                stock: p.stock,
                waiting: p.waiting,
              },
            )
          : t("{stock} left", { stock: p.stock }),
      to: SHOP_PATHS.product,
      params: { productId: p.productId },
    });
  }
  if (attention.codUnconfirmed > 0) {
    items.push({
      key: "cod",
      tag: t("COD"),
      tone: "warn",
      title: t(
        "{count, plural, one {# cash order not confirmed} other {# cash orders not confirmed}}",
        {
          count: attention.codUnconfirmed,
        },
      ),
      detail: t("The customer has not confirmed on WhatsApp yet."),
      to: SHOP_PATHS.orders,
    });
  }
  if (attention.openCartsToday.count > 0) {
    items.push({
      key: "carts",
      tag: t("Carts"),
      tone: "info",
      title: t("{count, plural, one {# open cart today} other {# open carts today}}", {
        count: attention.openCartsToday.count,
      }),
      detail: t("{value} waiting to be paid", {
        value: formatMoney(attention.openCartsToday.value, currency),
      }),
      to: SHOP_PATHS.orders,
    });
  }
  for (const r of attention.returnsRequested) {
    items.push({
      key: `return-${r.id}`,
      tag: t("Return"),
      tone: "err",
      title: t("Return requested on #{number}", { number: r.number }),
      detail: r.reason,
      to: SHOP_PATHS.order,
      params: { orderId: r.orderId },
    });
  }
  if (attention.failedDeliveries > 0) {
    items.push({
      key: "failed",
      tag: t("Delivery"),
      tone: "err",
      title: t("{count, plural, one {# delivery failed} other {# deliveries failed}}", {
        count: attention.failedDeliveries,
      }),
      detail: t("Arrange a new slot with the customer."),
      to: SHOP_PATHS.orders,
    });
  }
  if (attention.syncErrors > 0) {
    items.push({
      key: "sync",
      tag: t("Meta"),
      tone: "err",
      title: t(
        "{count, plural, one {# product rejected by Meta} other {# products rejected by Meta}}",
        {
          count: attention.syncErrors,
        },
      ),
      detail: t("Fix them so they show in WhatsApp and Instagram."),
      to: SHOP_PATHS.products,
    });
  }

  return (
    <ShopSection title={t("Needs attention")}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("Nothing needs you right now.")}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                params={item.params}
                className="flex items-start gap-3 rounded-lg bg-muted/60 p-3 hover:bg-muted"
              >
                <ToneBadge tone={item.tone}>{item.tag}</ToneBadge>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{item.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ShopSection>
  );
}
