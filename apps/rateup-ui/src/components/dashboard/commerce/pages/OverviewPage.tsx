import {
  IconArrowRight,
  IconCoin,
  IconEye,
  IconLoader2,
  IconPackage,
  IconReceipt,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";

import type { SpreadsheetFormat } from "@/backend/commerce/commerce.api";
import {
  useCommerceOrders,
  useCommerceOverview,
  useCommerceTimeseries,
  useCommerceTopProducts,
  useExportCommerceOverviewMutation,
} from "@/backend/commerce/commerce.query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useCommerce } from "../CommerceContext";
import { CommerceDateFilter, CommerceExportButton } from "../CommerceFilters";
import { CommerceShell, StatusPill } from "../CommerceShell";
import { STAGE_META, avatarClass } from "../orderMeta";
import { initials, money } from "../utils";

const TILE_CLASSES = [
  "bg-primary/10 text-primary",
  "bg-sky-500/10 text-sky-600",
  "bg-amber-500/10 text-amber-600",
  "bg-emerald-500/10 text-emerald-600",
];

/** Compact axis label: ₹12.5k rather than ₹12,500. */
function compact(value: number, sym: string) {
  if (value >= 1000) return `${sym}${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return `${sym}${Math.round(value)}`;
}

function DeltaBadge({ value }: Readonly<{ value: number | null }>) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1", up ? "text-emerald-600" : "text-destructive")}
    >
      {up ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
      {up ? "+" : ""}
      {value}%
    </Badge>
  );
}

export function OverviewPage() {
  const { currencySymbol: sym, filter } = useCommerce();

  const { data: overview, isLoading: loadingOverview } = useCommerceOverview(filter);
  const { data: timeseries, isLoading: loadingChart } = useCommerceTimeseries({
    ...filter,
    interval: "day",
  });
  const { data: topProducts } = useCommerceTopProducts({ ...filter, limit: 4 });
  const { data: ordersData } = useCommerceOrders({ ...filter, page: 0, limit: 5 });
  const exportOverview = useExportCommerceOverviewMutation();

  const recentOrders = ordersData?.data ?? [];
  const chart = timeseries ?? [];
  const chartMax = Math.max(...chart.map((point) => point.sales), 1);
  const dense = chart.length > 12;

  const statCards = [
    {
      label: "Total Sales",
      value: money(overview?.totalSales ?? 0, sym),
      delta: overview?.delta.totalSales ?? null,
      icon: IconCoin,
      tile: TILE_CLASSES[0],
    },
    {
      label: "Orders",
      value: String(overview?.orderCount ?? 0),
      delta: overview?.delta.orderCount ?? null,
      icon: IconPackage,
      tile: TILE_CLASSES[1],
    },
    {
      label: "Avg Order Value",
      value: money(Math.round(overview?.avgOrderValue ?? 0), sym),
      delta: overview?.delta.avgOrderValue ?? null,
      icon: IconReceipt,
      tile: TILE_CLASSES[2],
    },
    {
      label: "Products Live",
      value: String(overview?.productsLive ?? 0),
      delta: null,
      icon: IconEye,
      tile: TILE_CLASSES[3],
    },
  ];

  const handleExport = (format: SpreadsheetFormat) =>
    exportOverview.mutate({ ...filter, interval: "day", format });

  return (
    <CommerceShell
      title="Commerce Overview"
      description="Sales, orders and catalog performance at a glance."
      showCatalogSwitcher
      actions={
        <>
          <CommerceDateFilter />
          <CommerceExportButton onExport={handleExport} isPending={exportOverview.isPending} />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span
                    className={cn("flex size-9 items-center justify-center rounded-lg", s.tile)}
                  >
                    <s.icon className="size-[18px]" />
                  </span>
                  <DeltaBadge value={s.delta} />
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {loadingOverview ? (
                    <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    s.value
                  )}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart + top products */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm">Sales over time</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Revenue collected via WhatsApp checkout
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-[3px] bg-primary" />
                Revenue
              </div>
            </CardHeader>
            <CardContent>
              {loadingChart ? (
                <div className="flex h-48 items-center justify-center">
                  <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : chart.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  No sales in this period.
                </div>
              ) : (
                <div className="flex h-48 items-end gap-1 pt-4">
                  {chart.map((point) => {
                    const peak = point.sales === chartMax && point.sales > 0;
                    return (
                      <div
                        key={point.date}
                        title={`${dayjs(point.date).format("MMM D")} — ${money(point.sales, sym)} · ${point.orders} orders`}
                        className="flex h-full min-w-2.5 flex-1 flex-col items-center justify-end gap-2"
                      >
                        {!dense && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              peak ? "text-amber-600" : "text-muted-foreground",
                            )}
                          >
                            {compact(point.sales, sym)}
                          </span>
                        )}
                        <div
                          className={cn(
                            "w-full max-w-[34px] rounded-t-md",
                            peak ? "bg-amber-400" : "bg-primary",
                          )}
                          style={{
                            height: `${Math.max(Math.round((point.sales / chartMax) * 100), 2)}%`,
                          }}
                        />
                        <span className="truncate text-[11px] text-muted-foreground">
                          {dayjs(point.date).format(dense ? "D" : "MMM D")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top products</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(topProducts ?? []).map((p, i) => (
                <div key={p.retailerId} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                      TILE_CLASSES[i % TILE_CLASSES.length],
                    )}
                  >
                    {p.image ? (
                      <img src={p.image} alt="" className="size-full object-cover" />
                    ) : (
                      <IconPackage className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {money(p.revenue, sym)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${p.share}%` }}
                      />
                    </div>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {p.units} sold
                    </span>
                  </div>
                </div>
              ))}
              {(topProducts ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No sales in this period.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent orders */}
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <span className="text-sm font-semibold text-foreground">Recent orders</span>
            <Link
              to="/dashboard/commerce/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              View all <IconArrowRight className="size-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 && (
            <div className="px-5 py-4 text-sm text-muted-foreground">No orders in this period.</div>
          )}
          {recentOrders.map((o) => {
            const name = o.contact?.name || "Unknown";
            const stage = STAGE_META[o.orderStage ?? "DEFAULT"] ?? STAGE_META.DEFAULT;
            return (
              <div
                key={o.id}
                className="flex items-center gap-3.5 border-b px-5 py-3 last:border-b-0"
              >
                <span className="w-24 shrink-0 truncate font-mono text-xs font-semibold text-muted-foreground">
                  #{String(o.id).slice(-6)}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar className="size-7">
                    <AvatarFallback className={cn("text-[10px] text-white", avatarClass(name))}>
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm text-foreground">{name}</span>
                </div>
                <span className="w-[88px] shrink-0 text-right text-sm font-semibold text-foreground">
                  {money(o.total, sym)}
                </span>
                <StatusPill cls={stage.cls} className="hidden sm:inline-flex">
                  {stage.short}
                </StatusPill>
                <span className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground md:block">
                  {o.createdAt ? dayjs(o.createdAt).format("MMM D") : ""}
                </span>
              </div>
            );
          })}
        </Card>
      </div>
    </CommerceShell>
  );
}
