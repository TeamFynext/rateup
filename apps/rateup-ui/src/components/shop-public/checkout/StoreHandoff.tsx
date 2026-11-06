import { IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { startPublicStoreCheckout } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { CheckoutSection } from "./OrderParts.tsx";

/** Opens the shop's own checkout page; the order there is created on the first call only. */
function useStoreCheckout(token: string, onLeave: () => void) {
  return useMutation({
    mutationFn: () => startPublicStoreCheckout(token),
    // `replace`, so Back from the store returns to where the shopper came from, not here.
    onSuccess: ({ url }) => {
      onLeave();
      globalThis.location.replace(url);
    },
  });
}

/** Shopify asks for the address, delivery and payment itself, so this page only hands over. */
export function StoreRedirect({
  token,
  label,
  onLeave,
}: Readonly<{ token: string; label: string; onLeave: () => void }>) {
  const { t } = useTranslation();
  const start = useStoreCheckout(token, onLeave);
  const started = useRef(false);
  const { mutate } = start;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  return (
    <CheckoutSection>
      {start.isError ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-destructive" role="alert">
            {getApiErrorMessage(start.error, t("Couldn't open the checkout. Try again."))}
          </p>
          <Button variant="outline" onClick={() => start.mutate()} loading={start.isPending}>
            <IconRefresh />
            {t("Try again")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
          <Spinner className="size-6" />
          <p className="font-semibold">{t("Taking you to our secure checkout…")}</p>
          <p className="text-sm text-muted-foreground">
            {t("You'll add your delivery details and pay on {store}.", { store: label })}
          </p>
        </div>
      )}
    </CheckoutSection>
  );
}

/**
 * WooCommerce's payment page asks for no address or delivery, so this page collects them and
 * then sends the shopper there to pay.
 */
export function StoreContinueSection({
  token,
  label,
  flush,
  saving,
  blocker,
  onLeave,
}: Readonly<{
  token: string;
  label: string;
  flush: () => Promise<void>;
  saving: boolean;
  blocker: string | null;
  onLeave: () => void;
}>) {
  const { t } = useTranslation();
  const start = useStoreCheckout(token, onLeave);
  const go = useMutation({
    mutationFn: async () => {
      await flush();
      await start.mutateAsync();
    },
  });

  return (
    <CheckoutSection title={t("Pay")}>
      <Button
        type="button"
        size="lg"
        className="h-12 rounded-xl text-base font-bold"
        disabled={Boolean(blocker) || saving}
        loading={go.isPending || start.isSuccess}
        onClick={() => go.mutate()}
      >
        {t("Continue to payment")}
        <IconArrowRight />
      </Button>
      {blocker && <p className="text-center text-sm text-muted-foreground">{blocker}</p>}
      {go.isError && (
        <p className="text-center text-sm text-destructive" role="alert">
          {getApiErrorMessage(go.error, t("Couldn't open the checkout. Try again."))}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {t("You'll pay on {store}'s secure checkout, where any tax is added.", { store: label })}
      </p>
    </CheckoutSection>
  );
}
