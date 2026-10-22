import {
  IconCash,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconCreditCard,
  IconDeviceMobile,
  IconLoader2,
  IconMessageCircle,
  IconPackage,
  IconSearch,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CommerceOrder, SpreadsheetFormat } from "@/backend/commerce/commerce.api";
import {
  useCommerceOrders,
  useExportCommerceOrdersMutation,
} from "@/backend/commerce/commerce.query";
import OrderDetailsDialog from "@/components/dashboard/whatsapp/orders-and-payments/components/OrderDetailsDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-state.ts";
import { useCan } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils";

import { useCommerce } from "../CommerceContext";
import { CommerceDateFilter, CommerceExportButton } from "../CommerceFilters";
import { CommerceShell } from "../CommerceShell";
import { STAGE_META } from "../orderMeta";
import { settingsTab } from "../shop/shopMeta";
import { money } from "../utils";

const statusOptions = (t: TFunction) => [
  { id: "PENDING_PAYMENT", label: t("Pending"), dot: "bg-amber-500" },
  { id: "PENDING_CHECKOUT", label: t("Confirmed"), dot: "bg-primary" },
  { id: "PENDING_DELIVERY", label: t("Packed"), dot: "bg-sky-500" },
  { id: "PENDING_ADDRESS", label: t("Shipped"), dot: "bg-blue-500" },
  { id: "COMPLETED", label: t("Delivered"), dot: "bg-emerald-500" },
  { id: "CANCELLED", label: t("Cancelled"), dot: "bg-destructive" },
];

const filterOptions = (t: TFunction) => [
  { id: "all", label: t("All orders") },
  { id: "PENDING_PAYMENT", label: t("Pending") },
  { id: "PENDING_DELIVERY", label: t("To ship") },
  { id: "PENDING_ADDRESS", label: t("Shipped") },
  { id: "COMPLETED", label: t("Delivered") },
];

const PAGE_SIZE = 10;

function payMeta(t: TFunction, method?: string | null) {
  if (!method) return { icon: IconClock, label: t("Pending"), cls: "text-amber-600" };
  const m = method.toLowerCase();
  if (m.includes("upi")) return { icon: IconDeviceMobile, label: "UPI", cls: "text-foreground" };
  if (m.includes("cod") || m.includes("cash"))
    return { icon: IconCash, label: t("Cash on delivery"), cls: "text-foreground" };
  if (m.includes("whatsapp"))
    return { icon: IconMessageCircle, label: t("WhatsApp Pay"), cls: "text-emerald-600" };
  return { icon: IconCreditCard, label: method, cls: "text-foreground" };
}

export function CatalogOrdersPage() {
  const { t } = useTranslation();
  const { currencySymbol: sym, currentSetting, filter: baseFilter } = useCommerce();

  const [page, setPage] = useState(0);
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 400);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<CommerceOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Stage/search/date/channel are all applied server-side now, so any change
  // invalidates the current page offset.
  useEffect(() => {
    setPage(0);
  }, [stage, debouncedSearch, baseFilter]);

  const queryFilter = {
    ...baseFilter,
    ...(stage !== "all" && { orderStage: stage }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data: ordersData, isLoading } = useCommerceOrders({
    ...queryFilter,
    page,
    limit: PAGE_SIZE,
  });
  const exportOrders = useExportCommerceOrdersMutation();
  const canExport = useCan("commerce.orders.manage");

  const rows = ordersData?.data ?? [];
  const totalCount = ordersData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleExport = (format: SpreadsheetFormat) =>
    exportOrders.mutate({ ...queryFilter, format });

  return (
    <CommerceShell
      title={t("WhatsApp catalog orders")}
      back={{ ...settingsTab("legacy"), label: t("Settings") }}
      description={t("Orders placed through the WhatsApp catalog cart checkout.")}
      showCatalogSwitcher
      actions={
        <>
          <div className="relative hidden min-w-[200px] sm:block">
            <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search orders…")}
              className="pl-8"
            />
          </div>
          <CommerceDateFilter />
          {canExport && (
            <CommerceExportButton
              onExport={handleExport}
              isPending={exportOrders.isPending}
              disabled={totalCount === 0}
            />
          )}
        </>
      }
    >
      {!currentSetting ? (
        <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
          {t("No store connected.")}
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions(t).map((f) => {
              const active = stage === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStage(f.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-accent",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <Card className="gap-0 py-0">
            {/* column head */}
            <div className="flex items-center gap-3.5 border-b px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span className="w-24 shrink-0">{t("Order")}</span>
              <span className="flex-1">{t("Customer")}</span>
              <span className="hidden w-[70px] shrink-0 text-center md:block">{t("Items")}</span>
              <span className="w-24 shrink-0 text-right">{t("Total")}</span>
              <span className="hidden w-[120px] shrink-0 lg:block">{t("Payment")}</span>
              <span className="w-[132px] shrink-0">{t("Status")}</span>
              <span className="hidden w-16 shrink-0 text-right sm:block">{t("Date")}</span>
              <span className="w-20 shrink-0 text-right">{t("Action")}</span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-14">
                <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <IconPackage className="size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("No orders match the current filters.")}
                </p>
              </div>
            ) : (
              rows.map((o) => {
                const name = o.contact?.name || t("Unknown");
                const curStage = overrides[o.id] ?? o.orderStage ?? "DEFAULT";
                const stageMeta = STAGE_META[curStage] ?? STAGE_META.DEFAULT;
                const pm = payMeta(t, o.paymentMethod);
                return (
                  <div
                    key={o.id}
                    className="flex items-center gap-3.5 border-b px-5 py-3 last:border-b-0"
                  >
                    <span className="w-24 shrink-0 truncate font-mono text-xs font-semibold text-primary">
                      #{String(o.id).slice(-6)}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <ContactAvatar name={o.contact?.name} size="sm" />
                      <span className="truncate text-sm text-foreground">{name}</span>
                    </div>
                    <span className="hidden w-[70px] shrink-0 text-center text-sm text-muted-foreground md:block">
                      {t("{count, plural, one {# item} other {# items}}", { count: o.itemCount })}
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold text-foreground">
                      {money(o.total, sym)}
                    </span>
                    <span className="hidden w-[120px] shrink-0 lg:block">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          pm.cls,
                        )}
                      >
                        <pm.icon className="size-3.5" />
                        {pm.label}
                      </span>
                    </span>
                    <span className="w-[132px] shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              className={cn(
                                "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                stageMeta.cls,
                              )}
                            />
                          }
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {stageMeta.label}
                          <IconChevronDown className="size-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuGroup>
                            {statusOptions(t).map((st) => {
                              const isCurrent = st.id === curStage;
                              return (
                                <DropdownMenuItem
                                  key={st.id}
                                  onClick={() =>
                                    setOverrides((prev) => ({ ...prev, [o.id]: st.id }))
                                  }
                                >
                                  <span className={cn("size-2 rounded-full", st.dot)} />
                                  <span className="flex-1">{st.label}</span>
                                  {isCurrent && <IconCheck className="size-3.5 text-primary" />}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      {o.createdAt ? dayjs(o.createdAt).format("MMM D") : ""}
                    </span>
                    <span className="flex w-20 shrink-0 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(o);
                          setDetailsOpen(true);
                        }}
                      >
                        {t("Details")}
                      </Button>
                    </span>
                  </div>
                );
              })
            )}
          </Card>

          <OrderDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            order={selectedOrder}
          />

          {/* pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("{count, plural, one {# order} other {# orders}} total", { count: totalCount })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0 || isLoading}
              >
                {t("Previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("Page {page} of {total}", { page: page + 1, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => (p < totalPages - 1 ? p + 1 : p))}
                disabled={page >= totalPages - 1 || isLoading}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CommerceShell>
  );
}
