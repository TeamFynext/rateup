import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  Package,
  Receipt,
  TrendingUp,
} from "lucide-react";

import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import { useWaCatalogProducts } from "@/backend/whatsapp/catalog/products/products.query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useCommerce } from "../CommerceContext";
import { CommerceShell, StatusPill } from "../CommerceShell";
import { STAGE_META, avatarClass } from "../orderMeta";
import { initials, money } from "../utils";

const WEEKLY_SALES = [
  { day: "Mon", v: 42 },
  { day: "Tue", v: 58 },
  { day: "Wed", v: 49 },
  { day: "Thu", v: 71 },
  { day: "Fri", v: 63 },
  { day: "Sat", v: 88 },
  { day: "Sun", v: 74 },
];

const TILE_CLASSES = [
  "bg-primary/10 text-primary",
  "bg-sky-500/10 text-sky-600",
  "bg-amber-500/10 text-amber-600",
  "bg-emerald-500/10 text-emerald-600",
];

function orderTotal(o: any) {
  const items = (o.products ?? []).reduce(
    (s: number, p: any) =>
      s + (parseFloat(p.price ?? "0") || 0) * (parseInt(p.quantity ?? "1") || 1),
    0,
  );
  return items + (o.deliveryOption?.charge ?? 0);
}

export function OverviewPage() {
  const { phoneId, currencySymbol: sym } = useCommerce();
  const { data: connectedCatalog } = useConnectedWaCatalog(phoneId);
  const catalogId = connectedCatalog?.catalogId ?? "";

  const { data: ordersData } = useWaCatalogOrders(catalogId, {
    pageIndex: 0,
    pageSize: 5,
    storeType: "standard",
  });
  const { data: products } = useWaCatalogProducts(catalogId);

  const recentOrders: any[] = ordersData?.data ?? [];
  const totalOrders = ordersData?.totalCount ?? 0;
  const totalSales = recentOrders.reduce((s, o) => s + orderTotal(o), 0);
  const avgOrder = recentOrders.length ? Math.round(totalSales / recentOrders.length) : 0;

  const statCards = [
    {
      label: "Recent Sales",
      value: money(totalSales, sym),
      delta: "+18%",
      icon: CircleDollarSign,
      tile: TILE_CLASSES[0],
    },
    {
      label: "Orders",
      value: String(totalOrders),
      delta: "+12%",
      icon: Package,
      tile: TILE_CLASSES[1],
    },
    {
      label: "Avg Order Value",
      value: money(avgOrder, sym),
      delta: "+5%",
      icon: Receipt,
      tile: TILE_CLASSES[2],
    },
    {
      label: "Products Live",
      value: String(products?.length ?? 0),
      delta: "+24%",
      icon: Eye,
      tile: TILE_CLASSES[3],
    },
  ];

  const chartMax = Math.max(...WEEKLY_SALES.map((c) => c.v));
  const topProducts = (products ?? []).slice(0, 4);

  return (
    <CommerceShell
      title="Commerce Overview"
      description="Sales, orders and catalog performance at a glance."
      actions={
        <>
          <Button variant="outline" size="sm">
            <Calendar data-icon="inline-start" />
            Last 30 days
            <ChevronDown data-icon="inline-end" />
          </Button>
          <Button variant="outline" size="sm">
            <Download data-icon="inline-start" />
            Export
          </Button>
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
                  <Badge variant="secondary" className="gap-1 text-emerald-600">
                    <TrendingUp className="size-3" />
                    {s.delta}
                  </Badge>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  {s.value}
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
                <CardTitle className="text-sm">Sales this week</CardTitle>
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
              <div className="flex h-48 items-end gap-3.5 pt-4">
                {WEEKLY_SALES.map((b) => {
                  const peak = b.v === chartMax;
                  return (
                    <div
                      key={b.day}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span
                        className={cn(
                          "text-[11px] font-semibold",
                          peak ? "text-amber-600" : "text-muted-foreground",
                        )}
                      >
                        {sym}
                        {b.v}k
                      </span>
                      <div
                        className={cn(
                          "w-full max-w-[34px] rounded-t-md",
                          peak ? "bg-amber-400" : "bg-primary",
                        )}
                        style={{ height: `${Math.round((b.v / chartMax) * 100)}%` }}
                      />
                      <span className="text-[11px] text-muted-foreground">{b.day}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top products</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {topProducts.map((p: any, i: number) => {
                const title = p.productProps?.title ?? p.name ?? "Product";
                const price = p.productProps?.price ? `${sym}${p.productProps.price}` : "";
                const pct = [100, 82, 64, 45][i] ?? 40;
                return (
                  <div key={p.id ?? i} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        TILE_CLASSES[i % TILE_CLASSES.length],
                      )}
                    >
                      <Package className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {title}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          {price}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {topProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">No products synced yet.</p>
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
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 && (
            <div className="px-5 py-4 text-sm text-muted-foreground">No orders yet.</div>
          )}
          {recentOrders.map((o) => {
            const name = o.contact?.name || "Unknown";
            const stage = STAGE_META[o.orderStage] ?? STAGE_META.DEFAULT;
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
                  {money(orderTotal(o), sym)}
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
