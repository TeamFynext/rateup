import { IconMail, IconSparkles, IconTrendingUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useRateupPaymentsPlans } from "@/backend/payment/payment.query";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

/**
 * The plan catalogue, for an org that has no live subscription to switch: free, lapsed or
 * cancelled. An org with a live one changes tier through `ChangePlanDialog`, which offers
 * both directions and prorates.
 */
export function ChoosePlanDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();
  const { data: plans, isPending } = useRateupPaymentsPlans();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-*, not max-w-*: DialogContent's own base class is `sm:max-w-md`, so an
          unprefixed max-w never wins above 640px and the dialog stays 28rem wide. Wide
          enough for the four plan cards to sit in one row on desktop. */}
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconTrendingUp className="size-5" />
            {t("Choose a plan")}
          </DialogTitle>
        </DialogHeader>
        {isPending ? (
          <RateupLoader />
        ) : (
          <PricingSection
            plans={plans ?? []}
            variant="compact"
            // No `currentPlanName`: it narrows the cards to tiers above the current one,
            // which would leave a cancelled Pro customer unable to come back on Pro.
            onPlanSelect={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A sales-led tier has no self-serve upgrade — the only action is to get in touch. */
export function ContactSalesDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="size-5 text-amber-500" />
            {t("Change your custom plan")}
          </DialogTitle>
          <DialogDescription>
            {t("Your plan is contracted with our team, so changes go through us.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconMail className="size-4" />
          {t("Email us at")}
          <a href="mailto:hello@rateup.app" className="font-medium text-primary hover:underline">
            hello@rateup.app
          </a>
        </div>
        <Button onClick={() => onOpenChange(false)}>{t("Close")}</Button>
      </DialogContent>
    </Dialog>
  );
}
