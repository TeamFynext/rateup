import { Button } from "@rateup/ui/components/button";
import { IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useSubscription } from "@/backend/subscription/subscription.query";

/** Packs are paid-plan only, so a free org is sent to upgrade instead of to buy credits. */
export function CampaignCreditsCta({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation("campaign.wizard");
  const { data: subscription } = useSubscription();
  const isFreePlan = /free/i.test(subscription?.basePlan?.name ?? "");

  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      nativeButton={false}
      render={
        <Link to="/dashboard/settings/billing" search={{ tab: isFreePlan ? "plan" : "usage" }} />
      }
    >
      {isFreePlan ? t("Upgrade") : t("Buy credits")}
      <IconArrowUpRight className="size-3.5" aria-hidden />
    </Button>
  );
}
