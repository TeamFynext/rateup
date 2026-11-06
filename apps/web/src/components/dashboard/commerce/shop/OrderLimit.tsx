import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { IconAlertTriangle, IconReceipt } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubscriptionUsage } from "@/backend/subscription/subscription.query";
import { isUnlimitedCount } from "@/components/HomePage/pages/Pricing/pricing.data.ts";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";

const BILLING = "/dashboard/settings/billing";

/** The API refused a new order because the plan's monthly orders are spent (`ShopError` ORDER_LIMIT). */
export const isOrderLimitError = (error: unknown) => getApiErrorData(error)?.code === "ORDER_LIMIT";

/** This month's orders against the plan's cap; null when the plan does not cap them. */
export function useOrderAllowance() {
  const { data } = useSubscriptionUsage();
  const orders = data?.shopOrders;
  if (!orders || orders.max === null || isUnlimitedCount(orders.max)) return null;
  return { used: orders.used, max: orders.max, reached: orders.used >= orders.max };
}

function UpgradeLink() {
  const { t } = useTranslation();
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-2 w-fit"
      nativeButton={false}
      render={<Link to={BILLING} />}
    >
      {t("Upgrade plan")}
    </Button>
  );
}

/** "Orders this month — 12 of 50", for plans that cap orders. */
export function OrderAllowanceNotice() {
  const { t } = useTranslation();
  const allowance = useOrderAllowance();
  if (!allowance) return null;
  return (
    <Alert variant={allowance.reached ? "destructive" : "default"}>
      {allowance.reached ? <IconAlertTriangle /> : <IconReceipt />}
      <AlertTitle>
        {t("Orders this month — {used} of {max}", {
          used: Math.min(allowance.used, allowance.max),
          max: allowance.max,
        })}
      </AlertTitle>
      <AlertDescription>
        {allowance.reached
          ? t(
              "This month's orders are used up, so new orders are refused until the month resets. Upgrade to keep selling.",
            )
          : t("Your plan includes {max} orders a month. Upgrade for more.", {
              max: allowance.max,
            })}
        <UpgradeLink />
      </AlertDescription>
    </Alert>
  );
}

/** Inline form of the refusal, for a dialog (a toast cannot show above a modal's focus trap). */
export function OrderLimitAlert({ error }: Readonly<{ error: unknown }>) {
  const { t } = useTranslation();
  return (
    <Alert variant="destructive">
      <IconAlertTriangle />
      <AlertTitle>{t("Monthly order limit reached")}</AlertTitle>
      <AlertDescription>
        {getApiErrorMessage(error, t("Upgrade your plan to keep taking orders."))}
        <UpgradeLink />
      </AlertDescription>
    </Alert>
  );
}

/** Toasts an ORDER_LIMIT refusal with a way to upgrade; false for any other error. */
export function useOrderLimitToast() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (error: unknown) => {
    if (!isOrderLimitError(error)) return false;
    toast.error(getApiErrorMessage(error, t("Upgrade your plan to keep taking orders.")), {
      action: { label: t("Upgrade plan"), onClick: () => void navigate({ to: BILLING }) },
    });
    return true;
  };
}
