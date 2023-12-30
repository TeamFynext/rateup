import dayjs from "dayjs";
import { Box, Button, Group, Modal, Space, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { FeatureCard } from "./FeatureCard";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { useUpdateSubscriptionMutation } from "../../../backend/subscription/subscription.query";

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

  const updateMutation = useUpdateSubscriptionMutation();
  function handleSave() {
    updateMutation.mutate(
      { orgId: subscription.orgId, updatedData: subscriptionForm.values },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      padding="md"
      centered
      onClick={(e) => e.stopPropagation()}
      title={`Modify Subscription`}
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
            {Object.keys(subscription.features).map(
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
          <Button variant="outline">Cancel</Button>
          <Button loading={updateMutation.isPending} onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
