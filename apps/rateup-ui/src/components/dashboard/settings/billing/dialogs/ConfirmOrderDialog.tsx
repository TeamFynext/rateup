import { IconCircleCheck, IconRefresh, IconX } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";

import { cadenceLabel, formatAmount } from "../useBillingData.ts";

/**
 * The last step before paying: the numbers the customer is about to agree to. Opened by the
 * pricing page dropping a plan in the cart store.
 */
export function ConfirmOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  isStarting,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isStarting: boolean;
}>) {
  const { t } = useTranslation();
  const { cart } = useRouteAndCartStore();

  const formattedAmount = `${cart?.currencySymbol ?? ""}${formatAmount(
    cart?.amount,
    cart?.currency,
  )}`;

  // An annual plan is quoted as the yearly total; the pricing page leads with the monthly
  // figure, so show both.
  const monthlyEquivalent = useMemo(() => {
    const numeric = Number(cart?.amount);
    if (cadenceLabel(cart?.period) !== "year" || !Number.isFinite(numeric)) return null;
    return `${cart?.currencySymbol ?? ""}${formatAmount(Math.round(numeric / 12), cart?.currency)}`;
  }, [cart?.amount, cart?.period, cart?.currency, cart?.currencySymbol]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-*, not max-w-*: DialogContent's base class is `sm:max-w-md`, which wins
          over an unprefixed max-w above 640px and squeezes the order summary. */}
      <DialogContent className="w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("Confirm your order")}</DialogTitle>
          <DialogDescription>
            {t("Review your plan before continuing to payment.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-border bg-muted/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Plan")}
                </p>
                <h3 className="text-xl font-bold leading-tight">{cart?.name}</h3>
              </div>
              {cart?.period && (
                <Badge variant="secondary">
                  {cadenceLabel(cart.period) === "year" ? t("Annual") : t("Monthly")}
                </Badge>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight">{formattedAmount}</span>
              <span className="text-sm text-muted-foreground">/{cadenceLabel(cart?.period)}</span>
            </div>
            {monthlyEquivalent && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Works out to")} {monthlyEquivalent} /{t("month")}
              </p>
            )}

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("Due today")}</span>
              <span className="font-semibold">{formattedAmount}</span>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t(
                "WhatsApp message charges are billed to your own Meta account and are not part of this total.",
              )}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t("What's included")}</h4>
            <ul className="space-y-2">
              {(cart?.description ?? []).map((item) => {
                // A leading "-" marks a feature the plan does not include, as on the cards.
                const excluded = item.startsWith("-");
                return (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    {excluded ? (
                      <IconX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <IconCircleCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
                    )}
                    <span className={excluded ? "text-muted-foreground" : undefined}>
                      {excluded ? item.slice(1) : item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStarting}>
            {t("Cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isStarting}>
            {isStarting ? (
              <>
                <IconRefresh className="size-4 animate-spin" />
                {t("Starting")}
              </>
            ) : (
              t("Continue to payment")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
