import {
  ActionIcon,
  Badge,
  Blockquote,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import React from "react";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { checkExpiry } from "../../../components/Premium/ExpiryComponent";
import { formatIsoDateString } from "../../../utils/dateTime";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import Pricing from "../../../components/HomePage/pages/Pricing";
import { useDisclosure } from "@mantine/hooks";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import {
  IconCheck,
  IconInfoCircle,
  IconMail,
  IconRefresh,
} from "@tabler/icons-react";
import classes from "./setting.module.css";
import {
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import { useCancelRazorpaySubscriptionMutation } from "../../../backend/payment/payment.query";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";

const Billing = ({
  subscription,
  orders,
  activeOrderData,
  latestOrderData,
  processingPayment,
  refetch,
  isRefetching,
}) => {
  const [openedUpgradeModal, { toggle, close: closeUpgradeModal }] =
    useDisclosure(false);

  const [cancelDialogOpened, { open, close }] = useDisclosure();
  const CancelSubscription = useCancelRazorpaySubscriptionMutation();

  const handleCancelSubscription = () => {
    showLoadingToast(
      "Hold.. your subscription is getting cancelled...",
      "load-data",
      true,
      "Cancelling Subscription",
    );
    CancelSubscription.mutate();
  };

  return (
    <>
      {processingPayment ? (
        <Loader type="bars" />
      ) : (
        <Stack>
          {latestOrderData?.subscriptionStatus === "none" && (
            <Group style={{ maxWidh: "380px" }}>
              <Blockquote color="blue" icon={<IconInfoCircle />} my="lg">
                <Text mb="lg">
                  Your plan activation is under process. <br /> Kindly wait. You
                  will recived activations status as an email shortly.
                </Text>
                <RateupButtonPrimary
                  title="Refresh Status"
                  onClick={refetch}
                  rightIcon={<IconRefresh />}
                  disabled={isRefetching}
                />
              </Blockquote>
            </Group>
          )}

          <Group>
            <Title order={4}>Current Plan</Title>
            <Tooltip label="Refresh data">
              <ActionIcon
                variant="light"
                aria-label="Settings"
                onClick={async () => {
                  showLoadingToast(
                    "Hold on...data getting updated.",
                    "subscription",
                    true,
                    "Refreshing",
                  );
                  await refetch();
                  showSuccessToast(
                    "Updated Succesfully",
                    "subscription",
                    <IconCheck />,
                    true,
                  );
                }}
              >
                <IconRefresh
                  className={isRefetching ? classes.rotateInfinitely : null}
                  style={{ width: "90%", height: "90%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Tooltip>
          </Group>
          <ConfirmationModal
            forDeleteFunctionality
            opened={cancelDialogOpened}
            onClose={close}
            headerLabel="Are you sure you want to cancel your active subscription?"
            headerTitle="Cancel Subscription"
            confirmLabel="Delete"
            onConfirm={handleCancelSubscription}
            includeEmailConfirmation={true}
          />
          <PaperLayout w={"60%"} p={"xl"}>
            <Stack gap={"xl"}>
              <Group justify="space-between">
                <Stack gap={1} style={{ minWidth: "230px" }}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Plan Name
                  </Text>
                  <Title order={5}>{subscription?.basePlan?.name}</Title>
                </Stack>
                {activeOrderData?.subscriptionChargeAt &&
                  activeOrderData?.subscriptionStatus !== "cancelled" && (
                    <Stack gap={1}>
                      <Text c={"GrayText"} fw={500} fz={15}>
                        Next Charging on:
                      </Text>
                      <Title order={5}>
                        {formatIsoDateString(
                          activeOrderData?.subscriptionChargeAt,
                        )}
                      </Title>
                    </Stack>
                  )}

                {activeOrderData?.subscriptionStatus === "cancelled" &&
                  activeOrderData?.subscriptionEndedAt && (
                    <Stack gap={1}>
                      <Text c={"GrayText"} fw={500} fz={15}>
                        Cancelled on:
                      </Text>
                      <Title order={5}>
                        {formatIsoDateString(
                          activeOrderData?.subscriptionEndedAt,
                        )}
                      </Title>
                    </Stack>
                  )}

                {subscription?.basePlan?.name === "RATEUP TRIAL" ||
                subscription?.basePlan?.name === "FREE PLAN" ? (
                  <RateupButtonPrimary title="Upgrade plan" onClick={toggle} />
                ) : (
                  subscription?.basePlan?.name &&
                  (activeOrderData?.subscriptionStatus === "cancelled" ? (
                    <RateupButtonPrimary
                      title="Cancelled"
                      onClick={() => {}}
                      disabled
                    />
                  ) : (
                    <RateupButtonPrimary
                      title="Cancel Subscription"
                      onClick={open}
                      color="red"
                    />
                  ))
                )}
              </Group>
              <Group justify="space-between">
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Validity
                  </Text>
                  <Group>
                    <Text>
                      {" "}
                      {formatIsoDateString(subscription?.expiresAt)}{" "}
                    </Text>
                    <Badge
                      color={
                        checkExpiry(subscription?.expiresAt) ? "red" : "green"
                      }
                    >
                      {checkExpiry(subscription?.expiresAt)
                        ? "Expired"
                        : "Active"}
                    </Badge>
                    {checkExpiry(subscription?.expiresAt) ? (
                      <RateupButtonPrimary
                        title="Upgrade plan"
                        onClick={toggle}
                      />
                    ) : null}
                  </Group>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Billing Cycle
                  </Text>
                  <Title order={5}>
                    {subscription?.basePlan?.paymentPlan?.period ?? "----"}
                  </Title>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Plan Cost
                  </Text>
                  <Title order={5}>
                    {subscription?.basePlan?.paymentPlan?.amount ?? "----"}
                  </Title>
                </Stack>
              </Group>
              <Group justify="space-between">
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Addons
                  </Text>
                  <Title order={5}>Nil</Title>
                </Stack>
                {!["FREE PLAN", "RATEUP TRIAL"].includes(
                  subscription?.basePlan?.name,
                ) ? (
                  activeOrderData?.subscriptionStatus === "cancelled" ? (
                    <RateupButtonPrimary
                      title="Upgrade plan"
                      onClick={toggle}
                    />
                  ) : (
                    <RateupButtonPrimary title="Buy Addons" disabled />
                  )
                ) : null}
              </Group>

              <Group justify="center" mt="xl" mb="-20px">
                <Text c="dimmed">
                  {" "}
                  *For... Custom Plans / Support / Assistance
                </Text>
                <IconMail
                  style={{ width: "20px", height: "20px", color: "gray" }}
                  stroke={1.5}
                />
                <Text c="dimmed">
                  {" "}
                  <a href="mailto:hello@rateup.app"> hello@rateup.app</a>{" "}
                </Text>
              </Group>
            </Stack>
          </PaperLayout>
        </Stack>
      )}

      <FormModalLayout
        opened={openedUpgradeModal}
        onClose={closeUpgradeModal}
        centered
        title="Upgrade Your Plan"
        size="auto"
      >
        <Pricing isAccount={true} handleSelection={closeUpgradeModal} />
      </FormModalLayout>
    </>
  );
};

export default Billing;
