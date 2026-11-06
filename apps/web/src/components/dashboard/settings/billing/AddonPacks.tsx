import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconArrowUpRight, IconInfoCircle, IconMinus, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AddonKind, AddonOffer } from "@/backend/payment/payment.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

/** Mirrors the API's per-order cap; more than this is a conversation with sales. */
const MAX_PACKS_PER_PURCHASE = 20;

function formatCount(value: number | undefined) {
  return value === undefined ? "—" : value.toLocaleString("en-US");
}

interface Props {
  kind: AddonKind;
  offer: AddonOffer | undefined;
  isPending: boolean;
  /** Opens the Razorpay checkout for `quantity` packs of this kind. */
  onBuy: (kind: AddonKind, quantity: number) => void;
  isPurchasing: boolean;
  /** Shown instead of a purchase when the plan cannot buy packs (Free). */
  onUpgrade?: () => void;
}

/**
 * Buying and holding one kind of pack: a one-off top-up that lapses after `validDays`, so
 * the card shows what is in date and when it runs out. Eligibility is the API's call; a
 * refusal's `reason` is shown because it tells a Free org to upgrade instead.
 */
export function AddonPacks({
  kind,
  offer,
  isPending,
  onBuy,
  isPurchasing,
  onUpgrade,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardContent>
      </Card>
    );
  }

  if (!offer?.available) return null;

  const isContacts = kind === "active-contacts";
  const locale = offer.currency === "INR" ? "en-IN" : "en-US";
  const symbol = CURRENCY_SYMBOL[offer.currency ?? "INR"] ?? "";
  const units = formatCount(offer.unitsPerPack);
  const price =
    typeof offer.price === "number" ? `${symbol}${offer.price.toLocaleString(locale)}` : null;
  // A one-off charge has to name an amount, so an unpriced pack cannot be sold.
  const purchasable = offer.eligible && typeof offer.price === "number";
  const days = offer.validDays;

  function description() {
    if (!price) {
      return isContacts
        ? t("A one-off top-up on your plan's monthly active contacts.")
        : t("A one-off top-up on your plan's monthly campaign credits.");
    }
    return isContacts
      ? t(
          "{price} for {units} extra active contacts, good for {days} days. A one-off charge — nothing renews, and packs stack.",
          { price, units, days },
        )
      : t(
          "{price} for {units} campaign credits, good for {days} days. Used after your plan's credits run out. A one-off charge — nothing renews, and packs stack.",
          { price, units, days },
        );
  }

  const total = formatCount(quantity * offer.unitsPerPack);
  const totalPrice =
    typeof offer.price === "number"
      ? `${symbol}${(quantity * offer.price).toLocaleString(locale)}`
      : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {isContacts ? t("Active contact packs") : t("Campaign credit packs")}
          {offer.packs > 0 && (
            <Badge variant="secondary">
              {t("{count, plural, one {# pack} other {# packs}}", { count: offer.packs })}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description()}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {offer.packs > 0 && offer.activeUntil && (
          // Packs do not renew, so the customer has to be told when they stop counting.
          <p className="text-sm text-muted-foreground">
            {t("Your packs run out on {date}.", {
              date: dayjs(offer.activeUntil).format("D MMM YYYY"),
            })}
          </p>
        )}

        {!offer.eligible && offer.reason && (
          <Alert>
            <IconInfoCircle data-icon />
            <AlertDescription>{offer.reason}</AlertDescription>
          </Alert>
        )}

        {offer.eligible && typeof offer.price !== "number" && (
          <Alert>
            <IconInfoCircle data-icon />
            <AlertDescription>
              {t(
                "Packs are not yet priced in your billing currency. Contact us and we will sort it out.",
              )}
            </AlertDescription>
          </Alert>
        )}

        {purchasable && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("Fewer packs")}
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <IconMinus data-icon />
              </Button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("More packs")}
                disabled={quantity >= MAX_PACKS_PER_PURCHASE}
                onClick={() =>
                  setQuantity((current) => Math.min(MAX_PACKS_PER_PURCHASE, current + 1))
                }
              >
                <IconPlus data-icon />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {isContacts
                ? t("{total} extra active contacts · {totalPrice} once", { total, totalPrice })
                : t("{total} campaign credits · {totalPrice} once", { total, totalPrice })}
            </p>
          </div>
        )}
      </CardContent>

      {purchasable && (
        <CardFooter>
          <Button loading={isPurchasing} onClick={() => onBuy(kind, quantity)}>
            {t("{count, plural, one {Buy a pack} other {Buy # packs}}", { count: quantity })}
          </Button>
        </CardFooter>
      )}

      {!offer.eligible && onUpgrade && (
        <CardFooter>
          <Button onClick={onUpgrade}>
            {t("Upgrade")}
            <IconArrowUpRight data-icon />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
