"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { useRateupPaymentsPlanUpdateMutation } from "../../../backend/payment/payment.query";
import { useUpdateSubscriptionMutation } from "../../../backend/subscription/subscription.query";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { showLoadingToast } from "../../../utils/notifications";
import { FeatureCard } from "./FeatureCard";

interface SubscriptionEditorModalProps {
  opened: boolean;
  onClose: () => void;
  subscription: Subscription;
}
export function SubscriptionEditorModal({
  opened,
  onClose,
  subscription, // rateuplan if router.pathname === "/admin/rateup"
}: SubscriptionEditorModalProps) {
  const subscriptionForm = useForm({
    initialValues: {
      features: subscription.features,
      expiresAt: subscription.expiresAt,
    },
  });
  const translations = useTranslations();
  const pathname = usePathname();
  const rateupPlanEnable = pathname === "/admin/rateup";
  const updateMutation = useUpdateSubscriptionMutation();
  const rateupPaymentsPlanUpdateMutation =
    useRateupPaymentsPlanUpdateMutation(onClose);
  const isRazorPayPlan =
    !rateupPlanEnable && subscription?.basePlan?.paymentPlanId;
  function handleSave() {
    if (rateupPlanEnable) {
      showLoadingToast(
        translations("Plan is getting updated"),
        "load-data",
        true,
        translations("Updating"),
      );
      const updatedData: any = {
        id: subscription?.id,
        paymentPlanId: subscription?.paymentPlanId,
        features: subscriptionForm?.values.features,
      };
      rateupPaymentsPlanUpdateMutation.mutate(updatedData);
    } else {
      updateMutation.mutate(
        {
          orgId: subscription.orgId,
          updatedData: { ...subscriptionForm.values },
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
    subscriptionForm.setValues({
      features: subscription.features,
      expiresAt: subscription.expiresAt,
    });
  }, [subscription, opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      padding="md"
      centered
      onClick={(e) => e.stopPropagation()}
      title={
        rateupPlanEnable
          ? translations("Modify Rateup Plan")
          : translations("Modify Subscription")
      }
    >
      <Stack>
        {!rateupPlanEnable && (
          <>
            <DateInput
              label={translations("Expires At")}
              value={dayjs(subscriptionForm.values.expiresAt).toDate()}
              onChange={(value) =>
                subscriptionForm.setFieldValue("expiresAt", new Date(value))
              }
              disabled={!!isRazorPayPlan}
            />
            {new Date(subscription?.expiresAt) < new Date() &&
              isRazorPayPlan && (
                <Text
                  size="sm"
                  c={"var(--tertiary-color)"}
                  fw={"bold"}
                  m={"xs"}
                >
                  Cannot change expiry date of payment plan subscription. Try
                  changing the plan
                </Text>
              )}
          </>
        )}
        <Box
          style={{
            flex: 1,
          }}
        >
          <Text>Features</Text>
          <Stack
            gap={"xs"}
            bg={"whitesmoke"}
            p="sm"
            style={{
              borderRadius: "8px",
              overflow: "auto",
            }}
          >
            {subscription?.features &&
              Object.keys(subscription.features).map(
                (feature: SubscriptionFeaturePathName) => {
                  return (
                    <FeatureCard
                      key={feature}
                      featurePathName={feature}
                      subscriptionForm={subscriptionForm}
                    />
                  );
                },
              )}
          </Stack>
          {isRazorPayPlan && (
            <Text size="sm" c={"var(--tertiary-color)"} fw={"bold"} m={"xs"}>
              {translations(
                "*Note: The updated feature will be valid only till end of the current billing cycle",
              )}
            </Text>
          )}
        </Box>
        <Group justify="end">
          <Button variant="outline" onClick={onClose}>
            {translations("Cancel")}
          </Button>
          <Button loading={updateMutation.isPending} onClick={handleSave}>
            {translations("Save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
