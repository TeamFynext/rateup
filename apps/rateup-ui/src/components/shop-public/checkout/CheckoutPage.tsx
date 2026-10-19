import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ShopBankDetails } from "@/backend/commerce/shop.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { asApiError, getApiErrorMessage } from "@/utils/apiError.ts";

import { ShopUnavailable } from "../shared.tsx";
import { clearBag } from "../useBag.ts";
import { CheckoutForm } from "./CheckoutForm.tsx";
import { CheckoutHeader } from "./OrderParts.tsx";
import { OrderStatusView } from "./OrderStatusView.tsx";
import { StoreRedirect } from "./StoreHandoff.tsx";
import { publicCheckoutKey, useCheckout } from "./useCheckout.ts";

export function CheckoutPage({ token, justPaid }: Readonly<{ token: string; justPaid: boolean }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { query, saving, typingError, queue, send, flush } = useCheckout(token, justPaid);
  const [bankDetails, setBankDetails] = useState<ShopBankDetails | null>(null);

  if (query.isPending) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </main>
    );
  }

  if (query.isError) {
    const status = asApiError(query.error).response?.status;
    if (status === 404 || status === 410) {
      return (
        <ShopUnavailable
          title={
            status === 410
              ? t("This checkout link has expired")
              : t("We couldn't find this checkout")
          }
          description={t(
            "Ask the shop to send you a new link, or start again from their shop page.",
          )}
        />
      );
    }
    return (
      <ShopUnavailable
        title={t("Something went wrong")}
        description={getApiErrorMessage(query.error, t("Check your connection and try again."))}
      >
        <Button variant="outline" onClick={() => query.refetch()} loading={query.isFetching}>
          <IconRefresh />
          {t("Try again")}
        </Button>
      </ShopUnavailable>
    );
  }

  const checkout = query.data;
  const placed = checkout.order.status !== "DRAFT";
  const leaving = () => {
    if (checkout.order.channel === "STOREFRONT") clearBag(checkout.store.slug);
  };
  const store = checkout.storeCheckout;
  // Shopify takes it from here; WooCommerce needs the address and delivery picked here first.
  const handOff = !placed && store && !store.collectsDetails;

  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <CheckoutHeader store={checkout.store} />
      <main className="mx-auto w-full max-w-2xl p-4">
        {placed ? (
          <OrderStatusView
            token={token}
            checkout={checkout}
            bankDetails={bankDetails ?? checkout.bankDetails}
          />
        ) : handOff ? (
          <StoreRedirect token={token} label={store.label} onLeave={leaving} />
        ) : (
          <>
            {justPaid && (
              <Alert className="mb-3">
                <AlertTitle>{t("Confirming your payment")}</AlertTitle>
                <AlertDescription>
                  {t(
                    "This can take a few seconds. If you closed the payment page early, you can pay again below.",
                  )}
                </AlertDescription>
              </Alert>
            )}
            {/* Keyed by order so its local drafts start from this order's saved details. */}
            <CheckoutForm
              key={checkout.order.id}
              token={token}
              checkout={checkout}
              queue={queue}
              send={send}
              flush={flush}
              saving={saving}
              saveError={
                typingError
                  ? getApiErrorMessage(typingError, t("Couldn't save your details. Try again."))
                  : null
              }
              onLeave={leaving}
              onPlaced={(bank) => {
                setBankDetails(bank);
                if (checkout.order.channel === "STOREFRONT") clearBag(checkout.store.slug);
                void queryClient.invalidateQueries({ queryKey: publicCheckoutKey(token) });
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
