import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@rateup/ui/components/empty";
import { Progress } from "@rateup/ui/components/progress";
import { Skeleton } from "@rateup/ui/components/skeleton";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconPlus,
  IconRefresh,
  IconUpload,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  createShippingRate,
  createShopTestOrder,
  formatMoney,
  importShopProductsCsv,
  syncShopFromConnectedStore,
  toMoney,
  updateShopStore,
  type ShopStore,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopSetup, useShopStore } from "@/backend/commerce/shop.query";
import { Card } from "@/components/ui/card.tsx";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import { useCan, usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { CatalogConnect, WhatsappStatus } from "../settings/CatalogConnect.tsx";
import {
  RateFields,
  rateDraftValid,
  rateInput,
  countryName,
  standardRate,
  type RateDraft,
} from "../settings/DeliveryTab.tsx";
import { CopyButton } from "../settings/parts.tsx";
import { GatewayCards, OfflinePaymentCards } from "../settings/PaymentsTab.tsx";
import { StoreDisconnectedAlert } from "../settings/StoreCheckoutNotice.tsx";
import {
  SETUP_STEP_IDS,
  SHOP_PATHS,
  settingsTab,
  setupProductCount,
  setupStepTitle,
  type SetupStepId,
} from "../shop/shopMeta.ts";
import { ShopPage, ToneBadge } from "../shop/ShopUi.tsx";

export function SetupPage() {
  const { t } = useTranslation();
  const storeQuery = useShopStore();
  const setupQuery = useShopSetup();
  const isPending = storeQuery.isPending || setupQuery.isPending;
  const error = storeQuery.error ?? setupQuery.error;

  return (
    <ShopPage
      title={t("Set up your shop")}
      description={t(
        "A few steps from nothing to a paid order in WhatsApp. Each one saves as you go, so you can stop and come back.",
      )}
      actions={
        <Button variant="ghost" render={<Link to={SHOP_PATHS.overview} />}>
          {t("Go to overview")}
          <IconArrowRight data-icon="inline-end" />
        </Button>
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 rounded-xl" />
          {SETUP_STEP_IDS.map((id) => (
            <Skeleton key={id} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error || !storeQuery.data || !setupQuery.data ? (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("Could not load your shop")}</EmptyTitle>
            <EmptyDescription>{getApiErrorMessage(error, t("Please try again."))}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <SetupSteps store={storeQuery.data} setup={setupQuery.data} />
      )}
    </ShopPage>
  );
}

type Setup = NonNullable<ReturnType<typeof useShopSetup>["data"]>;

function SetupSteps({ store, setup }: Readonly<{ store: ShopStore; setup: Setup }>) {
  const { t } = useTranslation();
  const done = (id: SetupStepId) => setup.steps.some((s) => s.id === id && s.done);
  // A shop paid on its store's checkout gets a different set of steps from the API.
  const stepIds = SETUP_STEP_IDS.filter((id) => setup.steps.some((s) => s.id === id));
  const firstOpen = stepIds.find((id) => !done(id)) ?? null;
  // undefined follows the first unfinished step; null means the user closed everything.
  const [openId, setOpenId] = useState<SetupStepId | null | undefined>(undefined);
  const [testOrder, setTestOrder] = useState<TestOrder | null>(null);
  const [seenDone, setSeenDone] = useState(setup.done);
  // Finishing a step moves on to the next one, except the test order: its link is shown there.
  if (setup.done !== seenDone) {
    setSeenDone(setup.done);
    setOpenId(testOrder ? "test_order" : undefined);
  }
  const current = openId === undefined ? firstOpen : openId;
  const productCount = setupProductCount(setup.steps);
  const complete = setup.done >= setup.total;

  const summary: Record<SetupStepId, string> = {
    whatsapp: store.whatsapp?.connected
      ? store.whatsapp.numbers
          .map((n) => n.phone)
          .filter(Boolean)
          .join(", ") || t("Connected")
      : t("Where customers chat, shop and pay"),
    catalog: store.metaCatalogId
      ? (store.catalogs?.find((c) => c.catalogId === store.metaCatalogId)?.name ??
        t("Catalog connected"))
      : t("Lets WhatsApp and Instagram show your products"),
    products: productCount
      ? t("{count, plural, one {# product added} other {# products added}}", {
          count: productCount,
        })
      : t("Photos, a price and stock"),
    payments: t("Card payments, cash on delivery or bank transfer"),
    checkout:
      store.checkoutVia === "RATEUP"
        ? t("On RateUp checkout")
        : t("On your {store} checkout", {
            store: store.checkoutVia === "SHOPIFY" ? "Shopify" : "WooCommerce",
          }),
    shipping:
      (store.shippingRates?.length ?? 0)
        ? t("{count, plural, one {# delivery rate} other {# delivery rates}}", {
            count: store.shippingRates?.length ?? 0,
          })
        : t("What delivery costs and how long it takes"),
    test_order: t("See checkout as your customers will"),
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex-row flex-wrap items-center gap-4 px-6">
        <div className="flex min-w-56 flex-1 flex-col gap-2">
          <span className="text-[15px] font-bold text-foreground">
            {complete
              ? t("Your shop is ready")
              : t("{done} of {total} steps done", { done: setup.done, total: setup.total })}
          </span>
          <Progress value={(setup.done / Math.max(setup.total, 1)) * 100} />
        </div>
        {complete && (
          <Button render={<Link to={SHOP_PATHS.overview} />}>
            {t("Open your overview")}
            <IconArrowRight data-icon="inline-end" />
          </Button>
        )}
      </Card>

      <CurrencyCard store={store} />

      <ol className="flex flex-col gap-3">
        {stepIds.map((id, index) => (
          <SetupStep
            key={id}
            n={index + 1}
            title={setupStepTitle(t, id)}
            summary={summary[id]}
            done={done(id)}
            open={current === id}
            onToggle={() => setOpenId(current === id ? null : id)}
          >
            {id === "whatsapp" && <WhatsappStatus store={store} />}
            {id === "catalog" && <CatalogConnect store={store} />}
            {id === "products" && <ProductsStep store={store} count={productCount} />}
            {id === "payments" && <PaymentsStep store={store} />}
            {id === "checkout" && (
              <div className="flex flex-col items-start gap-3">
                <StoreDisconnectedAlert store={store} />
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Customers pay on your store's own checkout page. RateUp starts the order and sends them there from the storefront, chat and comment replies.",
                  )}
                </p>
                <Button variant="outline" size="sm" render={<Link {...settingsTab("checkout")} />}>
                  {t("Checkout settings")}
                </Button>
              </div>
            )}
            {id === "shipping" && <DeliveryStep store={store} />}
            {id === "test_order" && (
              <TestOrderStep
                store={store}
                hasProduct={done("products")}
                created={testOrder}
                onCreated={setTestOrder}
              />
            )}
          </SetupStep>
        ))}
      </ol>
    </div>
  );
}

function SetupStep({
  n,
  title,
  summary,
  done,
  open,
  onToggle,
  children,
}: Readonly<{
  n: number;
  title: string;
  summary: string;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  const bodyId = `setup-step-${n}`;
  return (
    <li>
      <Card className={cn("gap-0 py-0", open && "ring-primary/30")}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex w-full items-center gap-4 px-5 py-4 text-left"
        >
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              done
                ? "bg-green-600/10 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                : "bg-primary/10 text-primary",
            )}
          >
            {done ? <IconCheck className="size-4" aria-label={t("Done")} /> : n}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-[15px] font-bold text-foreground">{title}</span>
            <span className="truncate text-sm text-muted-foreground">{summary}</span>
          </span>
          {done && <ToneBadge tone="ok">{t("Done")}</ToneBadge>}
          <IconChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div id={bodyId} className="border-t border-border px-5 py-4">
            {children}
          </div>
        )}
      </Card>
    </li>
  );
}

function CurrencyCard({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const { canAny } = usePermissions();
  const canEdit = canAny(["commerce.payments.manage", "commerce.storefront.manage"]);
  const [editing, setEditing] = useState(false);
  const [currency, setCurrency] = useState(store.currency);
  const save = useMutation({
    mutationFn: () => updateShopStore({ currency }),
    onSuccess: () => {
      toast.success(t("Saved"));
      setEditing(false);
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save"))),
  });
  return (
    <Card size="sm" className="flex-row flex-wrap items-center gap-3 px-5">
      <div className="flex min-w-56 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {t("Your shop sells in {currency}", { currency: store.currency })}
        </span>
        <span className="text-sm text-muted-foreground">
          {t(
            "New shops start with your loyalty programme's currency, or US dollars. Prices, orders and payment links all use it.",
          )}
        </span>
      </div>
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-56">
            <CurrencySelect
              name="setup-currency"
              value={currency}
              onValueChange={(value) => setCurrency(value)}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            disabled={currency === store.currency}
            onClick={() => save.mutate()}
          >
            {t("Save")}
          </Button>
        </div>
      ) : (
        canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrency(store.currency);
              setEditing(true);
            }}
          >
            {t("Change")}
          </Button>
        )
      )}
    </Card>
  );
}

function ProductsStep({ store, count }: Readonly<{ store: ShopStore; count: number }>) {
  const { t } = useTranslation();
  const canEdit = useCan("commerce.products.manage");
  const invalidate = useInvalidateShop();
  const inputRef = useRef<HTMLInputElement>(null);
  const importCsv = useMutation({
    mutationFn: async (file: File) => importShopProductsCsv(await file.text()),
    onSuccess: (res) => {
      toast.success(
        res.skipped.length
          ? t(
              "{created, plural, one {# product added} other {# products added}}, {skipped, plural, one {# row skipped} other {# rows skipped}}",
              {
                created: res.created,
                skipped: res.skipped.length,
              },
            )
          : t("{count, plural, one {# product added} other {# products added}}", {
              count: res.created,
            }),
      );
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not import the file"))),
  });
  const sync = useMutation({
    mutationFn: syncShopFromConnectedStore,
    onSuccess: (result) => {
      toast.success(
        t(
          "Synced {total, plural, one {# product} other {# products}} — {created} new, {updated} updated",
          {
            total: result.total,
            created: result.created,
            updated: result.updated,
          },
        ),
      );
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not sync from your store"))),
  });

  if (!canEdit) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("Ask someone who manages products to add the first one.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {count
          ? t(
              "Products publish to WhatsApp, Instagram and your storefront. Add more any time from Products.",
            )
          : t(
              "Add a product with a photo, a price and how many you have. It publishes to WhatsApp, Instagram and your storefront.",
            )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button render={<Link to={SHOP_PATHS.newProduct} />}>
          <IconPlus data-icon="inline-start" />
          {count ? t("Add another product") : t("Add a product")}
        </Button>
        {store.mode === "NATIVE" ? (
          <Button
            variant="outline"
            loading={importCsv.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <IconUpload data-icon="inline-start" />
            {t("Import from CSV")}
          </Button>
        ) : (
          <Button variant="outline" loading={sync.isPending} onClick={() => sync.mutate()}>
            <IconRefresh data-icon="inline-start" />
            {store.mode === "SHOPIFY" ? t("Import from Shopify") : t("Import from WooCommerce")}
          </Button>
        )}
        {count > 0 && (
          <Button variant="ghost" render={<Link to={SHOP_PATHS.products} />}>
            {t("View products")}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importCsv.mutate(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function PaymentsStep({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const canManage = useCan("commerce.payments.manage");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Turn on at least one. Card payments go straight to your own Stripe or Razorpay account; RateUp takes no cut.",
        )}
      </p>
      <GatewayCards store={store} />
      <fieldset disabled={!canManage} className="flex min-w-0 flex-col gap-4">
        <OfflinePaymentCards store={store} />
      </fieldset>
      <Link
        {...settingsTab("payments")}
        className="w-fit text-sm font-semibold text-primary hover:underline"
      >
        {t("More options in Commerce → Settings → Getting paid")}
      </Link>
    </div>
  );
}

function DeliveryStep({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const canEdit = useCan("commerce.payments.manage");
  const [draft, setDraft] = useState<RateDraft>(() => standardRate(store));
  const set = (patch: Partial<RateDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const rates = store.shippingRates ?? [];
  const save = useMutation({
    mutationFn: () => createShippingRate(rateInput(draft, rates.length)),
    onSuccess: () => {
      toast.success(t("Shipping rate saved"));
      setDraft(standardRate(store));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save the rate"))),
  });

  if (rates.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1.5 text-sm">
          {rates.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{r.name}</span>
              <span className="text-muted-foreground">· {r.zone} ·</span>
              <span className="tabular-nums">
                {toMoney(r.price) === 0 ? t("Free") : formatMoney(r.price, store.currency)}
              </span>
              {!r.active && <ToneBadge tone="mute">{t("Off")}</ToneBadge>}
            </li>
          ))}
        </ul>
        <Link
          {...settingsTab("delivery")}
          className="w-fit text-sm font-semibold text-primary hover:underline"
        >
          {t("Add or change rates in Commerce → Settings → Delivery")}
        </Link>
      </div>
    );
  }

  return (
    <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {draft.countries.length
          ? t(
              "We filled in a standard rate for {country}. Set its price and save; you can add express or international rates later.",
              { country: countryName(draft.countries[0]) },
            )
          : t(
              "We filled in a standard rate for every address. Set its price and save; you can add express or country rates later.",
            )}
      </p>
      <RateFields draft={draft} set={set} currency={store.currency} idPrefix="setup-rate" />
      <Button
        className="w-fit"
        loading={save.isPending}
        disabled={!rateDraftValid(draft)}
        onClick={() => save.mutate()}
      >
        {t("Save delivery rate")}
      </Button>
    </fieldset>
  );
}

type TestOrder = Awaited<ReturnType<typeof createShopTestOrder>>;

function TestOrderStep({
  store,
  hasProduct,
  created,
  onCreated,
}: Readonly<{
  store: ShopStore;
  hasProduct: boolean;
  created: TestOrder | null;
  onCreated: (order: TestOrder) => void;
}>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const canSell = useCan("commerce.sell");
  const create = useMutation({
    mutationFn: () => createShopTestOrder(),
    onSuccess: (order) => {
      onCreated(order);
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not create the test order"))),
  });
  const providers = store.payments?.providers.filter((p) => p.connected) ?? [];
  const live = providers.filter((p) => p.livemode === true);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t(
          "We make a real order for one of your products, marked as a test, and give you its checkout link. Open it to see exactly what customers get.",
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {t(
          "To pay it without being charged, connect Stripe or Razorpay with test-mode keys; their test cards then work at checkout. Cash on delivery and bank transfer orders can be placed straight away.",
        )}
      </p>
      {store.checkoutVia !== "RATEUP" && (
        <Alert>
          <IconAlertTriangle aria-hidden />
          <AlertDescription>
            {t(
              "Opening its checkout creates a real order in {store}, tagged “rateup”. Delete it there afterwards, or cancel it here and RateUp closes it there.",
              { store: store.checkoutVia === "SHOPIFY" ? "Shopify" : "WooCommerce" },
            )}
          </AlertDescription>
        </Alert>
      )}
      {live.length > 0 && (
        <Alert>
          <IconAlertTriangle aria-hidden />
          <AlertDescription>
            {t(
              "{provider} is in live mode, so paying this order charges the card for real. Refund it from the order afterwards, or switch to test keys.",
              { provider: live.map((p) => p.label).join(", ") },
            )}
          </AlertDescription>
        </Alert>
      )}
      {created ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          <span className="font-semibold">
            {t("Test order #{number} is ready", { number: created.number })}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              render={<a href={created.checkoutUrl} target="_blank" rel="noreferrer" />}
            >
              {t("Open checkout")}
              <IconExternalLink data-icon="inline-end" />
            </Button>
            <CopyButton value={created.checkoutUrl} label={t("Copy checkout link")} />
            <Button
              size="sm"
              variant="ghost"
              render={<Link to={SHOP_PATHS.order} params={{ orderId: created.orderId }} />}
            >
              {t("See the order")}
            </Button>
          </span>
        </div>
      ) : (
        <Button
          className="w-fit"
          loading={create.isPending}
          disabled={!hasProduct || !canSell}
          onClick={() => create.mutate()}
        >
          {t("Create a test order")}
        </Button>
      )}
      {!hasProduct && <p className="text-sm text-muted-foreground">{t("Add a product first.")}</p>}
    </div>
  );
}
