import dayjs from "dayjs";
import {
  Banknote,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Loader2,
  MessageCircle,
  Package,
  Search,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useCommerce } from "../CommerceContext";
import { CommerceShell } from "../CommerceShell";
import { STAGE_META, avatarClass } from "../orderMeta";
import { initials, money } from "../utils";

const STATUS_OPTIONS = [
  { id: "PENDING_PAYMENT", label: "Pending", dot: "bg-amber-500" },
  { id: "PENDING_CHECKOUT", label: "Confirmed", dot: "bg-primary" },
  { id: "PENDING_DELIVERY", label: "Packed", dot: "bg-sky-500" },
  { id: "PENDING_ADDRESS", label: "Shipped", dot: "bg-blue-500" },
  { id: "COMPLETED", label: "Delivered", dot: "bg-emerald-500" },
  { id: "CANCELLED", label: "Cancelled", dot: "bg-destructive" },
];

const FILTERS = [
  { id: "all", label: "All orders" },
  { id: "PENDING_PAYMENT", label: "Pending" },
  { id: "PENDING_DELIVERY", label: "To ship" },
  { id: "PENDING_ADDRESS", label: "Shipped" },
  { id: "COMPLETED", label: "Delivered" },
];

function payMeta(method?: string) {
  const m = (method ?? "").toLowerCase();
  if (m.includes("upi")) return { icon: Smartphone, label: "UPI", cls: "text-foreground" };
  if (m.includes("cod") || m.includes("cash"))
    return { icon: Banknote, label: "COD", cls: "text-foreground" };
  if (m.includes("whatsapp"))
    return { icon: MessageCircle, label: "WhatsApp Pay", cls: "text-emerald-600" };
  if (m.includes("razor") || m.includes("card"))
    return { icon: CreditCard, label: method!, cls: "text-foreground" };
  if (!method) return { icon: Clock, label: "Pending", cls: "text-amber-600" };
  return { icon: CreditCard, label: method, cls: "text-foreground" };
}

function orderTotal(o: any) {
  const items = (o.products ?? []).reduce(
    (s: number, p: any) =>
      s + (parseFloat(p.price ?? "0") || 0) * (parseInt(p.quantity ?? "1") || 1),
    0,
  );
  return items + (o.deliveryOption?.charge ?? 0);
}

export function OrdersPage() {
  const { phoneId, currencySymbol: sym, currentSetting } = useCommerce();
  const { data: connectedCatalog, isLoading: loadingCatalog } = useConnectedWaCatalog(phoneId);
  const catalogId = connectedCatalog?.catalogId;

  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [filter, setFilter] = useState("all");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const { data: ordersData, isLoading } = useWaCatalogOrders(catalogId, {
    pageIndex: page,
    pageSize,
    storeType: "standard",
  });

  const allOrders: any[] = ordersData?.data ?? [];
  const totalCount = ordersData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const rows = allOrders.filter((o) =>
    filter === "all" ? true : (overrides[o.id] ?? o.orderStage) === filter,
  );

  return (
    <CommerceShell
      title="Orders"
      description="Track and fulfil orders placed through chat."
      actions={
        <>
          <div className="hidden min-w-[200px] items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground sm:flex">
            <Search className="size-4" />
            Search orders…
          </div>
          <Button variant="outline" size="sm">
            <Download data-icon="inline-start" />
            Export
          </Button>
        </>
      }
    >
      {!currentSetting ? (
        <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
          No store connected.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
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
              <span className="w-24 shrink-0">Order</span>
              <span className="flex-1">Customer</span>
              <span className="hidden w-[70px] shrink-0 text-center md:block">Items</span>
              <span className="w-24 shrink-0 text-right">Total</span>
              <span className="hidden w-[120px] shrink-0 lg:block">Payment</span>
              <span className="w-[132px] shrink-0">Status</span>
              <span className="hidden w-16 shrink-0 text-right sm:block">Date</span>
            </div>

            {loadingCatalog || isLoading ? (
              <div className="flex justify-center py-14">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : !catalogId ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Package className="size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No catalog connected to this store.</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">No orders.</div>
            ) : (
              rows.map((o) => {
                const name = o.contact?.name || "Unknown";
                const curStage = overrides[o.id] ?? o.orderStage;
                const stage = STAGE_META[curStage] ?? STAGE_META.DEFAULT;
                const pm = payMeta(o.paymentMethod);
                const items = (o.products ?? []).reduce(
                  (a: number, p: any) => a + (parseInt(p.quantity ?? "1") || 1),
                  0,
                );
                return (
                  <div
                    key={o.id}
                    className="flex items-center gap-3.5 border-b px-5 py-3 last:border-b-0"
                  >
                    <span className="w-24 shrink-0 truncate font-mono text-xs font-semibold text-primary">
                      #{String(o.id).slice(-6)}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar className="size-[30px]">
                        <AvatarFallback className={cn("text-xs text-white", avatarClass(name))}>
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm text-foreground">{name}</span>
                    </div>
                    <span className="hidden w-[70px] shrink-0 text-center text-sm text-muted-foreground md:block">
                      {items} {items === 1 ? "item" : "items"}
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold text-foreground">
                      {money(orderTotal(o), sym)}
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
                                stage.cls,
                              )}
                            />
                          }
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {stage.label}
                          <ChevronDown className="size-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuGroup>
                            {STATUS_OPTIONS.map((st) => {
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
                                  {isCurrent && <Check className="size-3.5 text-primary" />}
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
                  </div>
                );
              })
            )}
          </Card>

          {/* pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {totalCount} order{totalCount !== 1 ? "s" : ""} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => (p < totalPages - 1 ? p + 1 : p))}
                disabled={page >= totalPages - 1 || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </CommerceShell>
  );
}
