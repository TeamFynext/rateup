import dayjs from "dayjs";
import { Box, Button, Group, Modal, Space, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { FeatureCard } from "./FeatureCard";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { useUpdateSubscriptionMutation } from "../../../backend/subscription/subscription.query";
import { useRouter } from "next/router";
import { useRateupPaymentsPlanUpdateMutation } from "../../../backend/payment/payment.query";
import { useEffect } from "react";
import { showErrorToast, showLoadingToast } from "../../../utils/notifications";
import { IconX } from "@tabler/icons-react";

interface SubscriptionEditorModalProps {
  opened: boolean;
  onClose: () => void;
  subscription: Subscription;
}
export function SubscriptionEditorModal({
  opened,
  onClose,
  subscription,
}: SubscriptionEditorModalProps) {
  const subscriptionForm = useForm({
    initialValues: {
      features: subscription.features,
      expiresAt: subscription.expiresAt,
    },
  });
  const router = useRouter();
  const rateupPlanEnable = router.pathname === "/admin/rateup";
  const updateMutation = useUpdateSubscriptionMutation();
  const rateupPaymentsPlanUpdateMutation =
    useRateupPaymentsPlanUpdateMutation(onClose);
  function handleSave() {
    if (rateupPlanEnable) {
      showLoadingToast(
        "Plan is getting updated..",
        "load-data",
        true,
        "Updating",
      );
      const updatedData: any = {
        id: subscription?.id,
        paymentPlanId: subscription?.paymentPlanId,
        features: subscriptionForm?.values.features,
      };
      rateupPaymentsPlanUpdateMutation.mutate(updatedData);
    } else {
      if (!subscription.basePlan.name.toUpperCase().includes("CUSTOM")) {
        showErrorToast(
          "Subscription can only updated in custom plan",
          "",
          <IconX />,
        );
        return;
      }
      updateMutation.mutate(
        { orgId: subscription.orgId, updatedData: subscriptionForm.values },
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
      title={rateupPlanEnable ? `Modify Rateup Plan` : `Modify Subscription`}
    >
      <Stack>
        <DateInput
          label="Expires At"
          value={dayjs(subscriptionForm.values.expiresAt).toDate()}
          onChange={(value) =>
            subscriptionForm.setFieldValue("expiresAt", value)
          }
        />
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
        </Box>
        <Group justify="end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={updateMutation.isPending} onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
