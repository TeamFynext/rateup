import { IconInfoCircle, IconMinus, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ConversationAddonOffer } from "@/backend/payment/payment.api";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

/** One purchase can add a lot of headroom; more than this is a conversation with sales.
 *  The API caps it too — this only keeps the stepper from offering more than it will sell. */
const MAX_PACKS_PER_PURCHASE = 20;

function formatCount(value: number | undefined) {
  return value === undefined ? "—" : value.toLocaleString("en-US");
}

interface Props {
  offer: ConversationAddonOffer | undefined;
  isPending: boolean;
  /** Opens the Razorpay checkout for `quantity` packs. */
  onBuy: (quantity: number) => void;
  isPurchasing: boolean;
}

/**
 * Buying and holding conversation packs.
 *
 * A pack is a one-off top-up that covers a month and then lapses, so there is nothing to
 * cancel here — the card shows what is in date and when it runs out, and buying again is
 * the only action.
 *
 * The card is rendered for every plan rather than hidden, because what it has to say
 * differs by tier and each answer is useful: a paid plan can buy, Free is told upgrading
 * buys more than a pack would, and Enterprise is told its usage is already invoiced so
 * there is nothing to top up. Eligibility itself is decided by the API — this only
 * renders the answer, and the purchase endpoint refuses regardless.
 */
export function ConversationPacks({ offer, isPending, onBuy, isPurchasing }: Readonly<Props>) {
  const { t: translations } = useTranslation();
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

  // Nothing to say when the catalog carries no pack at all.
  if (!offer?.available) return null;

  const symbol = CURRENCY_SYMBOL[offer.currency ?? "INR"] ?? "";
  const perPack = formatCount(offer.conversationsPerPack);
  const priceLabel =
    typeof offer.price === "number"
      ? `${symbol}${offer.price.toLocaleString(offer.currency === "INR" ? "en-IN" : "en-US")}`
      : null;
  // A one-off charge has to name an amount, so an unpriced pack cannot be sold.
  const purchasable = offer.eligible && typeof offer.price === "number";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {translations("Conversation packs")}
          {offer.packs > 0 && (
            <Badge variant="secondary">
              {offer.packs} {offer.packs === 1 ? translations("pack") : translations("packs")}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {priceLabel
            ? `${priceLabel} ${translations("for")} ${perPack} ${translations(
                "extra conversations, good for",
              )} ${offer.validDays} ${translations(
                "days. A one-off charge — nothing renews, and packs stack.",
              )}`
            : translations("A one-off top-up on your plan's monthly conversation allowance.")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {offer.packs > 0 && (
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm">
              {translations("Your packs add")}{" "}
              <span className="font-semibold text-foreground">
                {formatCount(offer.allowance.addonConversations)}
              </span>{" "}
              {translations("conversations, for a total of")}{" "}
              <span className="font-semibold text-foreground">
                {formatCount(offer.allowance.effectiveMax)}
              </span>
              .
            </p>
            {offer.activeUntil && (
              // The end date is the whole difference from a subscription: there is no
              // renewal to expect, so the customer has to be told when it stops.
              <p className="mt-1 text-sm text-muted-foreground">
                {translations("Runs out on")} {dayjs(offer.activeUntil).format("D MMM YYYY")}.
              </p>
            )}
          </div>
        )}

        {/* The reason is the whole value of a refusal — a Free customer needs to hear
            "upgrade", not "unavailable". */}
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
              {translations(
                "Conversation packs are not yet priced in your billing currency. Contact us and we will sort it out.",
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
                aria-label={translations("Fewer packs")}
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
                aria-label={translations("More packs")}
                disabled={quantity >= MAX_PACKS_PER_PURCHASE}
                onClick={() =>
                  setQuantity((current) => Math.min(MAX_PACKS_PER_PURCHASE, current + 1))
                }
              >
                <IconPlus data-icon />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCount(quantity * offer.conversationsPerPack)}{" "}
              {translations("extra conversations")}
              {typeof offer.price === "number" &&
                ` · ${symbol}${(quantity * offer.price).toLocaleString(
                  offer.currency === "INR" ? "en-IN" : "en-US",
                )} ${translations("once")}`}
            </p>
          </div>
        )}
      </CardContent>

      {purchasable && (
        <CardFooter>
          <Button disabled={isPurchasing} onClick={() => onBuy(quantity)}>
            {isPurchasing
              ? translations("Processing")
              : quantity === 1
                ? translations("Buy a pack")
                : `${translations("Buy")} ${quantity} ${translations("packs")}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
