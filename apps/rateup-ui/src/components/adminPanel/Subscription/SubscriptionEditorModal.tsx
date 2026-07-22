import { DateInput } from "@mantine/dates";
import { useRouterState } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useRateupPaymentsPlanUpdateMutation } from "@/backend/payment/payment.query";
import { useUpdateSubscriptionMutation } from "@/backend/subscription/subscription.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { SubscriptionFeaturePathName } from "@/types/enums.ts";

import { FeatureCard } from "./FeatureCard.tsx";

export type SubscriptionFormValues = {
  features: Record<string, any>;
  expiresAt: Date;
};

interface SubscriptionEditorModalProps {
  opened: boolean;
  onClose: () => void;
  subscription: Subscription;
}
export function SubscriptionEditorModal({
  opened,
  onClose,
  subscription, // rateuplan if router.pathname === "/admin/rateup"
}: Readonly<SubscriptionEditorModalProps>) {
  const subscriptionForm = useForm<SubscriptionFormValues>({
    defaultValues: {
      features: subscription.features,
      expiresAt: subscription.expiresAt,
    },
  });
  const { t: translations } = useTranslation();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const rateupPlanEnable = pathname === "/admin/rateup";
  const updateMutation = useUpdateSubscriptionMutation();
  const rateupPaymentsPlanUpdateMutation = useRateupPaymentsPlanUpdateMutation(onClose);
  const isRazorPayPlan = !rateupPlanEnable && subscription?.basePlan?.paymentPlanId;
  const expiresAt = subscriptionForm.watch("expiresAt");

  function handleSave() {
    const values = subscriptionForm.getValues();
    if (rateupPlanEnable) {
      toast.loading(translations("Plan is getting updated.."), {
        id: "load-data",
      });
      const updatedData: any = {
        id: subscription?.id,
        paymentPlanId: subscription?.paymentPlanId,
        features: values.features,
      };
      rateupPaymentsPlanUpdateMutation.mutate(updatedData);
    } else {
      updateMutation.mutate(
        {
          orgId: subscription.orgId,
          updatedData: { ...values },
        },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    }
  }

  useEffect(() => {
    subscriptionForm.reset({
      features: subscription.features,
      expiresAt: subscription.expiresAt,
    });
  }, [subscription, opened]);

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {rateupPlanEnable
              ? translations("Modify Rateup Plan")
              : translations("Modify Subscription")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {subscription?.basePlan?.name.includes("FREE") && (
            <p className="text-sm text-destructive">
              *Recommended: Change Subscription from FREE Plan to Custom Plan and make the changes
            </p>
          )}
          {!rateupPlanEnable && (
            <>
              <Field>
                <FieldLabel htmlFor="expires-at">{translations("Expires At")}</FieldLabel>
                <DateInput
                  id="expires-at"
                  value={dayjs(expiresAt).toDate()}
                  onChange={(value) => subscriptionForm.setValue("expiresAt", new Date(value))}
                  disabled={!!isRazorPayPlan}
                />
              </Field>
              {new Date(subscription?.expiresAt) < new Date() && isRazorPayPlan && (
                <p className="text-sm font-bold text-(--tertiary-color)">
                  Cannot change expiry date of payment plan subscription. Try changing the plan
                </p>
              )}
            </>
          )}
          <div className="flex-1">
            <p>Features</p>
            <div className="flex flex-col gap-3 overflow-auto rounded-lg bg-muted p-3">
              {subscription?.features &&
                Object.keys(subscription.features).map((feature: SubscriptionFeaturePathName) => {
                  // Tickets are a free feature — no longer subscription-managed.
                  if (feature === "menu" || feature === "ticket") return null;
                  return (
                    <FeatureCard
                      key={feature}
                      featurePathName={feature}
                      control={subscriptionForm.control}
                    />
                  );
                })}
            </div>
            {isRazorPayPlan && (
              <p className="text-sm font-bold text-(--tertiary-color)">
                {translations(
                  "*Note: The updated feature will be valid only till end of the current billing cycle",
                )}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {translations("Cancel")}
            </Button>
            <Button disabled={updateMutation.isPending} onClick={handleSave}>
              {updateMutation.isPending && <Spinner />}
              {translations("Save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
