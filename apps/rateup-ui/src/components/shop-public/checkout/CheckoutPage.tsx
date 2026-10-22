import { IconClockExclamation, IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PublicCheckout, ShopBankDetails } from "@/backend/commerce/shop.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { asApiError, getApiErrorMessage } from "@/utils/apiError.ts";

import { MessageShopButton, ShopUnavailable } from "../shared.tsx";
import { clearBag } from "../useBag.ts";
import { CheckoutForm } from "./CheckoutForm.tsx";
import { CheckoutHeader } from "./OrderParts.tsx";
import { OrderStatusView } from "./OrderStatusView.tsx";
import { StoreRedirect } from "./StoreHandoff.tsx";
import { publicCheckoutKey, useCheckout } from "./useCheckout.ts";

interface Props {
  token: string;
  justPaid: boolean;
  /** Back from the gateway's cancel link. */
  paymentCancelled?: boolean;
}

export function CheckoutPage({ token, justPaid, paymentCancelled }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { query, saving, typingError, queue, send, flush, confirmingPayment, paymentNotSeen } =
    useCheckout(token, justPaid);
  const [bankDetails, setBankDetails] = useState<ShopBankDetails | null>(null);
  const storeName = query.data?.store.name;

  useEffect(() => {
    if (storeName) document.title = t("Checkout · {store}", { store: storeName });
  }, [storeName, t]);

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
  if (checkout.checkoutExpired) return <ExpiredCheckout checkout={checkout} />;

  const placed = checkout.order.status !== "DRAFT";
  const leaving = () => {
    if (checkout.order.channel === "STOREFRONT") clearBag(checkout.store.slug);
  };
  const store = checkout.storeCheckout;
  // Shopify takes it from here; WooCommerce needs the address and delivery picked here first.
  const handOff = !placed && store && !store.collectsDetails;
  const askForHelp = t("Hi {store}, I tried to pay for order #{number} and need help.", {
    store: checkout.store.name,
    number: checkout.order.number,
  });

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
            {confirmingPayment && (
              <Alert className="mb-3" role="status">
                <AlertTitle>{t("Confirming your payment")}</AlertTitle>
                <AlertDescription>{t("This can take a few seconds.")}</AlertDescription>
              </Alert>
            )}
            {paymentNotSeen && (
              <Alert className="mb-3" role="status">
                <IconClockExclamation />
                <AlertTitle>{t("We haven't received your payment yet")}</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <span>
                    {t(
                      "If money has left your account, don't pay again. Check again in a minute, or message {store} and they'll look into it.",
                      { store: checkout.store.name },
                    )}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl"
                      loading={query.isFetching}
                      onClick={() => query.refetch()}
                    >
                      <IconRefresh />
                      {t("Check again")}
                    </Button>
                    <MessageShopButton
                      whatsappNumber={checkout.store.whatsappNumber}
                      text={askForHelp}
                    />
                  </span>
                </AlertDescription>
              </Alert>
            )}
            {paymentCancelled && !justPaid && (
              <Alert className="mb-3" role="status">
                <AlertTitle>{t("Payment didn't go through")}</AlertTitle>
                <AlertDescription>
                  {t("You left the payment page before paying. You can try again below.")}
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
              payment={confirmingPayment ? "confirming" : paymentNotSeen ? "not_seen" : null}
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

function ExpiredCheckout({ checkout }: Readonly<{ checkout: PublicCheckout }>) {
  const { t } = useTranslation();
  const { store, order } = checkout;
  return (
    <ShopUnavailable
      title={t("This checkout link has expired")}
      description={
        store.whatsappNumber
          ? t("Message {store} and they'll send you a new one.", { store: store.name })
          : t("Ask {store} for a new link, or start again from their shop page.", {
              store: store.name,
            })
      }
    >
      <div className="flex flex-col gap-2">
        <MessageShopButton
          whatsappNumber={store.whatsappNumber}
          variant="default"
          label={t("Message {store} on WhatsApp", { store: store.name })}
          text={t(
            "Hi {store}, my checkout link for order #{number} expired. Can you send a new one?",
            {
              store: store.name,
              number: order.number,
            },
          )}
        />
        {store.storefrontEnabled && (
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            render={<Link to="/s/$slug" params={{ slug: store.slug }} search={{}} />}
          >
            {t("Back to the shop")}
          </Button>
        )}
      </div>
    </ShopUnavailable>
  );
}
