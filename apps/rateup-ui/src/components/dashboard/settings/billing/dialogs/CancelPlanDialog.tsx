import { IconAlertCircle, IconCircleCheck, IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCancelRazorpaySubscriptionMutation } from "@/backend/payment/payment.query";
import { useCancelStripeSubscriptionMutation } from "@/backend/payment/stripe/stripe.query";
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
import { formatIsoDateString } from "@/utils/dateTime.ts";

/**
 * Confirming a cancellation, and the receipt afterwards.
 *
 * Cancelling stops the renewal; the plan itself runs to the date it was paid through, and
 * only then does the nightly downgrade move the org to Free. Both steps name that date
 * rather than leaving "until the validity expires" to be guessed at.
 */
export function CancelPlanDialog({
  open,
  onOpenChange,
  subscription,
  onCancelled,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription;
  onCancelled: () => void;
}>) {
  const { t } = useTranslation();
  const [showReceipt, setShowReceipt] = useState(false);
  const cancelRazorpay = useCancelRazorpaySubscriptionMutation();
  const cancelStripe = useCancelStripeSubscriptionMutation();

  const endsOn = subscription?.expiresAt ? formatIsoDateString(subscription.expiresAt) : null;
  const isPending = cancelRazorpay.isPending || cancelStripe.isPending;

  function confirm() {
    toast.loading(t("Cancelling your subscription…"), { id: "cancel-subscription" });
    const mutation = subscription?.basePlan?.stripeProduct ? cancelStripe : cancelRazorpay;
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.dismiss("cancel-subscription");
        onOpenChange(false);
        setShowReceipt(true);
        onCancelled();
      },
      onError: () => toast.dismiss("cancel-subscription"),
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertCircle className="size-5 text-destructive" />
              {t("Cancel your plan?")}
            </DialogTitle>
            <DialogDescription>
              {endsOn
                ? `${t("You keep every paid feature until")} ${endsOn}, ${t(
                    "and this organisation then moves to the Free plan.",
                  )}`
                : t(
                    "You keep every paid feature until the end of the current billing period, after which this organisation moves to the Free plan.",
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("Keep my plan")}
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={isPending}>
              {isPending ? t("Cancelling") : t("Cancel plan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconCircleCheck className="size-5 text-green-600" />
              {t("Plan cancelled")}
            </DialogTitle>
            <DialogDescription>
              {endsOn
                ? `${t("You keep every paid feature until")} ${endsOn}. ${t(
                    "Resubscribe any time before then to keep going without a break.",
                  )}`
                : t("You keep every paid feature until the end of the current billing period.")}
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <IconMail className="size-4" />
            {t("Need help?")}
            <a href="mailto:hello@rateup.app" className="font-medium text-primary hover:underline">
              hello@rateup.app
            </a>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowReceipt(false)}>{t("Done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
