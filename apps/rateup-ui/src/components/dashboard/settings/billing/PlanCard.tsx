import {
  IconArrowsExchange,
  IconExternalLink,
  IconMail,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import type { BillingData } from "./useBillingData.ts";
import { currencySymbol, formatAmount } from "./useBillingData.ts";

/**
 * The plan itself: what it costs and the actions that change it. Status, next charge and the
 * "runs until X, then Free" sentence belong to the summary strip above.
 */
export function PlanCard({
  data,
  onBuy,
  onChangePlan,
  onCancel,
  isBusy,
}: Readonly<{
  data: BillingData;
  /** Start a fresh subscription — free/expired/cancelled orgs have nothing to switch. */
  onBuy: () => void;
  /** Move a live subscription between tiers. */
  onChangePlan: () => void;
  onCancel: () => void;
  isBusy: boolean;
}>) {
  const { t } = useTranslation();
  const { subscription, cost, state } = data;

  const amount =
    cost.amount === undefined
      ? null
      : `${currencySymbol(cost.currency)}${formatAmount(cost.amount, cost.currency)}`;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-medium">
            {subscription?.basePlan?.displayName || t("No plan")}
          </h3>
          {state.isFreePlan ? (
            <p className="text-sm text-muted-foreground">
              {t("Free forever, with the limits below.")}
            </p>
          ) : state.isShopifyPlan ? (
            <a
              href="https://admin.shopify.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("Manage this subscription in Shopify")}
              <IconExternalLink className="size-3.5" />
            </a>
          ) : state.isSalesLedPlan ? (
            <p className="inline-flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <IconMail className="size-4" />
              {t("This plan is managed by our team —")}
              <a
                href="mailto:hello@rateup.app"
                className="font-medium text-primary hover:underline"
              >
                hello@rateup.app
              </a>
            </p>
          ) : amount ? (
            <p className="text-sm text-muted-foreground">
              {amount}
              {cost.cadence ? ` / ${cost.cadence}` : ""}
              {cost.currency ? ` · ${cost.currency}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.canChangePlan ? (
            <>
              <Button onClick={onChangePlan} disabled={isBusy}>
                <IconArrowsExchange className="size-4" />
                {t("Change plan")}
              </Button>
              <Button variant="outline" onClick={onCancel} disabled={isBusy}>
                <IconX className="size-4" />
                {t("Cancel plan")}
              </Button>
            </>
          ) : (
            !state.isShopifyPlan &&
            !state.isProcessingPlan && (
              <Button onClick={onBuy} disabled={isBusy}>
                <IconTrendingUp className="size-4" />
                {state.isCancelled || state.isExpired
                  ? t("Resubscribe")
                  : state.isFreePlan
                    ? t("Choose a plan")
                    : t("Upgrade plan")}
              </Button>
            )
          )}
        </div>
      </CardContent>

      {state.isCancelled && (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {t("Resubscribe any time to pick up where you left off.")}
        </CardContent>
      )}
    </Card>
  );
}
