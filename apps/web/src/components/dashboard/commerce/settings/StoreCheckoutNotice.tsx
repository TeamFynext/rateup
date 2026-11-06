import { Alert, AlertAction, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { IconAlertTriangle, IconBuildingStore } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { stopShopStoreSync, type ShopStore } from "@/backend/commerce/shop.api";
import { useInvalidateShop } from "@/backend/commerce/shop.query";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { settingsTab } from "../shop/shopMeta.ts";

const STORE_NAME = { SHOPIFY: "Shopify", WOOCOMMERCE: "WooCommerce" } as const;

/** The followed store's name, or null for a shop with products of its own. */
export const followedStore = (store: Pick<ShopStore, "mode">) =>
  store.mode === "NATIVE" ? null : STORE_NAME[store.mode];

/** Paid on the store's checkout, so RateUp's own payment settings don't apply. */
export const paysInStore = (store: Pick<ShopStore, "checkoutVia">) =>
  store.checkoutVia !== "RATEUP";

/**
 * Over settings that only apply to RateUp checkout (payments, invoices, coupons), while
 * customers pay on the store's checkout instead. WooCommerce still uses RateUp's delivery
 * rates, so the Delivery tab says so rather than calling them unused.
 */
export function StoreCheckoutBanner({
  store,
  area,
}: Readonly<{ store: ShopStore; area: "payments" | "delivery" | "coupons" }>) {
  const { t } = useTranslation();
  if (!paysInStore(store)) return null;
  const name = STORE_NAME[store.checkoutVia as keyof typeof STORE_NAME];
  const usesOurRates = area === "delivery" && store.checkoutVia === "WOOCOMMERCE";
  if (area === "delivery" && store.checkoutVia === "SHOPIFY") {
    return (
      <Alert>
        <IconBuildingStore />
        <AlertTitle>{t("Customers pay on your Shopify checkout")}</AlertTitle>
        <AlertDescription>
          {t(
            "Shopify's own shipping rates apply there. These rates apply only to RateUp checkout.",
          )}
        </AlertDescription>
        <CheckoutLink />
      </Alert>
    );
  }
  return (
    <Alert>
      <IconBuildingStore />
      <AlertTitle>{t("Customers pay on your {store} checkout", { store: name })}</AlertTitle>
      <AlertDescription>
        {usesOurRates
          ? t(
              "They pick one of these rates before paying there, since WooCommerce's payment page has no delivery step.",
            )
          : area === "coupons"
            ? t(
                "RateUp codes can't be used there; create codes in {store} instead. These apply only to RateUp checkout.",
                { store: name },
              )
            : t(
                "{store} takes the payment and sends the invoice. These apply only to RateUp checkout.",
                {
                  store: name,
                },
              )}
      </AlertDescription>
      <CheckoutLink />
    </Alert>
  );
}

function CheckoutLink() {
  const { t } = useTranslation();
  return (
    <AlertAction>
      <Button variant="outline" size="sm" render={<Link {...settingsTab("checkout")} />}>
        {t("Checkout settings")}
      </Button>
    </AlertAction>
  );
}

/** The store this shop follows was disconnected: sales still work, but on RateUp checkout. */
export function StoreDisconnectedAlert({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const name = followedStore(store);
  if (!name || store.externalStoreConnected !== false) return null;
  return (
    <Alert variant="destructive">
      <IconAlertTriangle />
      <AlertTitle>{t("{store} is disconnected", { store: name })}</AlertTitle>
      <AlertDescription>
        {t(
          "Products have stopped syncing and customers check out in RateUp. Reconnect {store} in Integrations, or stop syncing to keep selling these products as your own.",
          { store: name },
        )}
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" render={<Link to="/dashboard/settings/integrations" />}>
          {t("Integrations")}
        </Button>
      </AlertAction>
    </Alert>
  );
}

/** Turns the followed store's products into the shop's own and takes payment in RateUp. */
export function StopSyncButton({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const canProducts = useCan("commerce.products.manage");
  const canPayments = useCan("commerce.payments.manage");
  const name = followedStore(store);
  const stop = useMutation({
    mutationFn: stopShopStoreSync,
    onSuccess: ({ products }) => {
      toast.success(
        t("{count, plural, one {# product is} other {# products are}} now your own", {
          count: products,
        }),
      );
      void invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("Couldn't stop syncing"))),
  });
  if (!name || !canProducts || !canPayments) return null;
  return (
    <Button
      variant="outline"
      loading={stop.isPending}
      onClick={async () => {
        const ok = await confirm({
          title: t("Stop syncing from {store}?", { store: name }),
          description: t(
            "Its products stay in RateUp as your own, and you edit their prices and stock here from now on. Customers check out in RateUp, and orders are no longer added to {store}.",
            { store: name },
          ),
          confirmText: t("Stop syncing"),
        });
        if (ok) stop.mutate();
      }}
    >
      {t("Stop syncing from {store}", { store: name })}
    </Button>
  );
}
