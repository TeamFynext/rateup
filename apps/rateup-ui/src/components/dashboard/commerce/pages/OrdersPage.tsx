import {
  IconAlertCircle,
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCircleCheck,
  IconFlask,
  IconHistory,
  IconInbox,
  IconLink,
  IconPlus,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  createShopTestOrder,
  formatMoney,
  setShopFulfillment,
  type ShopChannel,
  type ShopOrderRow,
  type ShopOrderTab,
  type ShopPaymentStatus,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopOrders } from "@/backend/commerce/shop.query";
import { ListPageSearchInput } from "@/components/common/list-page-layout.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { usePermissions } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { CreateOrderDialog } from "../shop/CreateOrderDialog.tsx";
import { SaveSegmentDialog } from "../shop/SaveSegmentDialog.tsx";
import {
  channelLabel,
  customerName,
  fulfillmentBadge,
  nextStepLabel,
  paymentBadge,
  settingsTab,
  SHOP_PATHS,
} from "../shop/shopMeta.ts";
import { LinkField, ShopPage, ToneBadge } from "../shop/ShopUi.tsx";
import { useLegacyCatalog } from "../shop/useLegacyCatalog";

const TABS: readonly ShopOrderTab[] = [
  "all",
  "needs_action",
  "awaiting_payment",
  "to_pack",
  "shipped",
  "delivered",
  "returns",
  "drafts",
  "cancelled",
];
const isTab = (value: unknown): value is ShopOrderTab => TABS.some((tab) => tab === value);

const CHANNELS: readonly ShopChannel[] = [
  "WHATSAPP",
  "INSTAGRAM",
  "MESSENGER",
  "STOREFRONT",
  "MANUAL",
];
const PAYMENTS: readonly ShopPaymentStatus[] = [
  "PAID",
  "PENDING",
  "UNPAID",
  "COD_PENDING",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "EXPIRED",
  "FAILED",
];
const ALL = "all";
const PAGE_SIZE = 25;

function when(t: (key: string, values?: Record<string, unknown>) => string, iso: string) {
  const d = dayjs(iso);
  if (d.isSame(dayjs(), "day")) return t("Today, {time}", { time: d.format("HH:mm") });
  if (d.isSame(dayjs().subtract(1, "day"), "day"))
    return t("Yesterday, {time}", { time: d.format("HH:mm") });
  return d.format("MMM D, HH:mm");
}

function handle(row: ShopOrderRow): string {
  if (row.channel === "INSTAGRAM" && row.contact?.whatsappUserName)
    return `@${row.contact.whatsappUserName}`;
  return row.customerPhone ?? row.contact?.phone ?? "";
}

export function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canManage = can("commerce.orders.manage");
  const invalidate = useInvalidateShop();

  const [tab, setTab] = useState<ShopOrderTab>("all");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState(ALL);
  const [payment, setPayment] = useState(ALL);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isPending, isError, error, refetch } = useShopOrders({
    tab,
    search: debouncedSearch || undefined,
    channel: CHANNELS.find((c) => c === channel),
    paymentStatus: PAYMENTS.find((p) => p === payment),
    page,
    limit: PAGE_SIZE,
  });

  const resetPaging = () => {
    setPage(0);
    setSelected(new Set());
  };

  const markPacked = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => setShopFulfillment(id, "PACKED")));
      return results.filter((r) => r.status === "rejected").length;
    },
    onSuccess: (failed) => {
      if (failed > 0) {
        toast.warning(
          t("{count, plural, one {# order} other {# orders}} could not be marked packed", {
            count: failed,
          }),
        );
      } else {
        toast.success(t("Marked as packed"));
      }
      setSelected(new Set());
      void invalidate();
    },
  });

  const tabLabels: Record<ShopOrderTab, string> = {
    all: t("All"),
    needs_action: t("Needs action"),
    awaiting_payment: t("Awaiting payment"),
    to_pack: t("To pack"),
    shipped: t("Shipped"),
    delivered: t("Delivered"),
    returns: t("Returns"),
    drafts: t("Drafts"),
    cancelled: t("Cancelled"),
  };

  const items = data?.items ?? [];
  const showInvoice = items.some((o) => o.invoiceNumber);
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const allSelected = items.length > 0 && items.every((o) => selected.has(o.id));
  const filtering = Boolean(debouncedSearch) || channel !== ALL || payment !== ALL || tab !== "all";

  const { hasLegacy } = useLegacyCatalog();

  return (
    <ShopPage
      title={t("Orders")}
      description={t(
        "Every order from WhatsApp, Instagram, Messenger and your storefront, in one list.",
      )}
      wide
      actions={
        <>
          {hasLegacy && (
            <Button variant="ghost" render={<Link to={SHOP_PATHS.catalogOrders} />}>
              <IconHistory data-icon="inline-start" />
              {t("WhatsApp catalog orders")}
            </Button>
          )}
          {can("contacts.manage") && (
            <Button variant="outline" onClick={() => setSegmentOpen(true)}>
              <IconUsersGroup data-icon="inline-start" />
              {t("Save shoppers as a group")}
            </Button>
          )}
          {can("commerce.sell") && <TestOrderButton variant="outline" />}
          {can("commerce.sell") && (
            <Button onClick={() => setCreating(true)}>
              <IconPlus data-icon="inline-start" />
              {t("Create order")}
            </Button>
          )}
        </>
      }
    >
      <Card className="gap-0 py-0">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isTab(value)) {
              setTab(value);
              resetPaging();
            }
          }}
          className="border-b border-border px-4 pt-2"
        >
          <TabsList variant="line" className="h-auto flex-wrap justify-start">
            {TABS.map((key) => (
              <TabsTrigger key={key} value={key} className="flex-none">
                {tabLabels[key]}
                {key in counts && (
                  <span
                    className={
                      key === "needs_action" && (counts[key] ?? 0) > 0
                        ? "rounded-full bg-amber-50 px-1.5 text-xs text-amber-700 tabular-nums dark:bg-amber-950/40 dark:text-amber-500"
                        : "text-xs text-muted-foreground tabular-nums"
                    }
                  >
                    {counts[key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <ListPageSearchInput
            className="min-w-56 flex-1"
            value={search}
            placeholder={t("Search order, name, phone or Instagram handle")}
            onChange={(value) => {
              setSearch(value);
              resetPaging();
            }}
          />
          <Select
            value={channel}
            onValueChange={(value) => {
              setChannel(value ?? ALL);
              resetPaging();
            }}
            items={[
              { value: ALL, label: t("All channels") },
              ...CHANNELS.map((c) => ({ value: c, label: channelLabel(t, c) })),
            ]}
          >
            <SelectTrigger className="w-40" aria-label={t("Channel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("All channels")}</SelectItem>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c}>
                  {channelLabel(t, c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={payment}
            onValueChange={(value) => {
              setPayment(value ?? ALL);
              resetPaging();
            }}
            items={[
              { value: ALL, label: t("All payments") },
              ...PAYMENTS.map((p) => ({ value: p, label: paymentBadge(t, p).label })),
            ]}
          >
            <SelectTrigger className="w-44" aria-label={t("Payment")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("All payments")}</SelectItem>
              {PAYMENTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {paymentBadge(t, p).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canManage && selected.size > 0 && (
          <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-sm font-semibold">
              {t("{count, plural, one {# order selected} other {# orders selected}}", {
                count: selected.size,
              })}
            </span>
            <Button
              size="sm"
              variant="outline"
              loading={markPacked.isPending}
              onClick={() => markPacked.mutate([...selected])}
            >
              {t("Mark packed")}
            </Button>
          </div>
        )}

        {isPending ? (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("Could not load orders")}</EmptyTitle>
              <EmptyDescription>
                {getApiErrorMessage(error, t("Please try again."))}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => void refetch()}>
                {t("Retry")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : items.length === 0 ? (
          filtering ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("No orders match")}</EmptyTitle>
                <EmptyDescription>{t("Try another tab, search or filter.")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <FirstOrderGuide canSell={can("commerce.sell")} />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && (
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      aria-label={t("Select all")}
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? new Set(items.map((o) => o.id)) : new Set())
                      }
                    />
                  </TableHead>
                )}
                <TableHead className={canManage ? undefined : "pl-4"}>{t("Order")}</TableHead>
                {showInvoice && <TableHead>{t("Invoice")}</TableHead>}
                <TableHead>{t("Customer")}</TableHead>
                <TableHead>{t("Channel")}</TableHead>
                <TableHead>{t("Items")}</TableHead>
                <TableHead>{t("Total")}</TableHead>
                <TableHead>{t("Payment")}</TableHead>
                <TableHead>{t("Fulfillment")}</TableHead>
                <TableHead className="pr-4">{t("Next step")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => {
                const pay = paymentBadge(t, o.paymentStatus);
                const ful = fulfillmentBadge(t, o);
                const quantity = o.items.reduce((s, i) => s + i.quantity, 0);
                const open = () =>
                  void navigate({ to: SHOP_PATHS.order, params: { orderId: o.id } });
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    data-state={selected.has(o.id) ? "selected" : undefined}
                    onClick={open}
                  >
                    {canManage && (
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={t("Select order #{number}", { number: o.number })}
                          checked={selected.has(o.id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(o.id);
                              else next.delete(o.id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell className={canManage ? undefined : "pl-4"}>
                      <Link
                        to={SHOP_PATHS.order}
                        params={{ orderId: o.id }}
                        className="font-bold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{o.number}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {when(t, o.placedAt ?? o.createdAt)}
                      </div>
                    </TableCell>
                    {showInvoice && (
                      <TableCell className="text-muted-foreground tabular-nums">
                        {o.invoiceNumber ?? "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-semibold">
                        {customerName(t, o.customerName ?? o.contact?.name)}
                      </div>
                      <div className="text-xs text-muted-foreground">{handle(o)}</div>
                    </TableCell>
                    <TableCell>{channelLabel(t, o.channel)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t("{count, plural, one {# item} other {# items}}", { count: quantity })}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatMoney(o.total, o.currency)}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        <ToneBadge tone={pay.tone}>{pay.label}</ToneBadge>
                        {o.reviewReason && <ToneBadge tone="warn">{t("Needs review")}</ToneBadge>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ToneBadge tone={ful.tone}>{ful.label}</ToneBadge>
                    </TableCell>
                    <TableCell className="pr-4 text-[13px] text-muted-foreground">
                      {nextStepLabel(t, o.nextStep)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
          <span>{t("Showing {from}–{to} of {total}", { from, to, total })}</span>
          <span className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("Previous")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={to >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Next")}
            </Button>
          </span>
        </div>
      </Card>

      <CreateOrderDialog open={creating} onOpenChange={setCreating} />
      <SaveSegmentDialog open={segmentOpen} onOpenChange={setSegmentOpen} />
    </ShopPage>
  );
}

/** The empty Orders list: the three ways a first order arrives, each with its next step. */
function FirstOrderGuide({ canSell }: Readonly<{ canSell: boolean }>) {
  const { t } = useTranslation();
  const ways = [
    {
      icon: <IconBrandWhatsapp />,
      title: t("A customer sends a cart"),
      body: t(
        "Shoppers browse your WhatsApp catalog, add products to a cart and send it to you in chat.",
      ),
      action: (
        <Button size="sm" variant="outline" render={<Link to="/dashboard/inbox" />}>
          <IconInbox data-icon="inline-start" />
          {t("Open inbox")}
        </Button>
      ),
    },
    {
      icon: <IconLink />,
      title: t("You send a payment link"),
      body: t(
        "In any conversation, use Sell → Create order to build their cart and send a link to pay.",
      ),
      action: canSell ? <TestOrderButton variant="outline" size="sm" /> : null,
    },
    {
      icon: <IconBuildingStore />,
      title: t("Shoppers buy on your storefront"),
      body: t("Your storefront is a shop page anyone can open from a link, a QR code or your bio."),
      action: (
        <Button size="sm" variant="outline" render={<Link {...settingsTab("store")} />}>
          <IconBuildingStore data-icon="inline-start" />
          {t("Storefront settings")}
        </Button>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-base font-bold tracking-tight">{t("No orders yet")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Orders reach this list in three ways. Try one to see how it works.")}
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ways.map((way) => (
          <li
            key={way.title}
            className="flex flex-col items-start gap-2 rounded-lg border border-border p-4"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
              {way.icon}
            </span>
            <span className="text-sm font-semibold">{way.title}</span>
            <span className="flex-1 text-sm text-muted-foreground">{way.body}</span>
            {way.action}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Makes a real draft order marked as a test, and hands back its checkout link to try. */
function TestOrderButton({
  variant,
  size,
}: Readonly<{ variant: "outline" | "default"; size?: "sm" }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: () => createShopTestOrder(),
    onSuccess: () => void invalidate(),
    onSettled: () => setOpen(true),
  });
  const result = create.data;
  return (
    <>
      <Button
        variant={variant}
        size={size}
        loading={create.isPending}
        onClick={() => create.mutate()}
      >
        <IconFlask data-icon="inline-start" />
        {t("Create test order")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Test order")}</DialogTitle>
            <DialogDescription>
              {t("Open the checkout link and go through it the way a customer would.")}
            </DialogDescription>
          </DialogHeader>
          {result ? (
            <div className="flex flex-col gap-3">
              <Alert>
                <IconCircleCheck className="text-green-600 dark:text-green-500" />
                <AlertTitle>
                  {t("Test order #{number} created", { number: result.number })}
                </AlertTitle>
                <AlertDescription>
                  {t("It is a draft marked as a test, with one of your active products in it.")}
                </AlertDescription>
              </Alert>
              <LinkField url={result.checkoutUrl} label={t("Checkout link")} />
            </div>
          ) : (
            create.isError && (
              <Alert variant="destructive">
                <IconAlertCircle />
                <AlertDescription className="flex flex-col items-start gap-2">
                  <span>
                    {getApiErrorMessage(create.error, t("Couldn't create the test order."))}
                  </span>
                  <Button size="sm" variant="outline" render={<Link to={SHOP_PATHS.newProduct} />}>
                    <IconPlus data-icon="inline-start" />
                    {t("Add a product")}
                  </Button>
                </AlertDescription>
              </Alert>
            )
          )}
          <DialogFooter>
            {result && (
              <Button
                variant="outline"
                render={<Link to={SHOP_PATHS.order} params={{ orderId: result.orderId }} />}
              >
                {t("Open order")}
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>{t("Done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
