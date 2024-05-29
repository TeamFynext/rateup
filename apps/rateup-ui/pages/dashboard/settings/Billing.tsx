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
import React, { useEffect, useState } from "react";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { checkExpiry } from "../../../components/Premium/ExpiryComponent";
import { formatIsoDateString } from "../../../utils/dateTime";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import Pricing from "../../../components/HomePage/pages/Pricing";
import { useDisclosure, useElementSize } from "@mantine/hooks";
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
import { useRouter } from "next/router";
import { useCancelStripeSubscriptionMutation } from "../../../backend/payment/stripe/stripe.query";

const Billing = ({
  subscription,
  activeOrderData,
  latestOrderData,
  processingPayment,
  refetch,
  refreshOrders,
  isRefetching,
}) => {
  const [openedUpgradeModal, { toggle, close: closeUpgradeModal }] =
    useDisclosure(false);

  const [customUpgradeModal, { toggle: openCustom, close: closeCustomModal }] =
    useDisclosure(false);

  const [cancelResult, { toggle: openCancelResult, close: closeCancelResult }] =
    useDisclosure(false);

  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [isProcessingPlan, setIsProcessingPlan] = useState(
    latestOrderData?.subscriptionStatus === "pending" || false,
  );

  useEffect(() => {
    if (
      subscription?.basePlan?.name &&
      subscription.basePlan.name.toUpperCase().includes("CUSTOM")
    ) {
      setIsCustomPlan(true);
    } else {
      setIsCustomPlan(false);
    }
  }, [subscription?.basePlan?.name]);

  useEffect(() => {
    setIsProcessingPlan(latestOrderData?.subscriptionStatus === "pending");
  }, [latestOrderData?.subscriptionStatus]);

  const [cancelDialogOpened, { open, close }] = useDisclosure();
  const CancelRazorpaySubscription = useCancelRazorpaySubscriptionMutation();
  const CancelStripeSubscription = useCancelStripeSubscriptionMutation();

  const { ref, width } = useElementSize();
  const router = useRouter();
  const handleCancelSubscription = () => {
    showLoadingToast(
      "Hold.. your subscription is getting cancelled...",
      "load-data",
      true,
      "Cancelling Subscription",
    );

    if (subscription?.basePlan?.stripeProduct) {
      CancelStripeSubscription.mutate(null, {
        onSuccess: (r) => {
          openCancelResult();
        },
      });
    } else {
      CancelRazorpaySubscription.mutate(null, {
        onSuccess: (r) => {
          openCancelResult();
        },
      });
    }
  };

  function handleRefresh() {
    refetch();
    refreshOrders();
  }

  return (
    <>
      {processingPayment ? (
        <Loader type="bars" />
      ) : (
        <Stack>
          {isProcessingPlan && (
            <Blockquote
              color="blue"
              icon={<IconInfoCircle />}
              mb="lg"
              style={{ width: width + 70, minWidth: width + 70 }}
            >
              <Group justify="space-between">
                <Text mb="lg">
                  Your plan activation is under process. <br /> You will receive
                  activation status via email shortly. <br />
                  Usually takes between 30seconds to 15 mins.
                </Text>
                <RateupButtonPrimary
                  title="Refresh Status"
                  onClick={handleRefresh}
                  rightIcon={<IconRefresh />}
                  disabled={isRefetching}
                />
              </Group>
            </Blockquote>
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
                  await handleRefresh();
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
            confirmLabel="Confirm Cancel"
            closeLabel="Close "
            onConfirm={handleCancelSubscription}
            includeEmailConfirmation={true}
          />
          <PaperLayout w={"60%"} p={"xl"}>
            <Stack gap={"xl"} ref={ref}>
              <Group justify="space-between">
                <Stack gap={1} style={{ minWidth: "230px" }}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Plan Name
                  </Text>
                  <Title order={5}>{subscription?.basePlan?.name}</Title>
                </Stack>
                {activeOrderData?.subscriptionChargeAt &&
                  activeOrderData?.subscriptionStatus !== "cancelled" &&
                  !isCustomPlan && (
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
                  activeOrderData?.subscriptionEndedAt &&
                  !isCustomPlan && (
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
                (subscription?.basePlan?.name === "FREE PLAN" &&
                  !isCustomPlan &&
                  !isProcessingPlan) ? (
                  <RateupButtonPrimary title="Upgrade plan" onClick={toggle} />
                ) : (
                  subscription?.basePlan?.name &&
                  (activeOrderData?.subscriptionStatus === "cancelled" &&
                  !isCustomPlan ? (
                    <RateupButtonPrimary
                      title="Cancelled"
                      onClick={() => {}}
                      disabled
                    />
                  ) : (
                    !isCustomPlan &&
                    !isProcessingPlan && (
                      <RateupButtonPrimary
                        title="Cancel Subscription"
                        onClick={open}
                        color="red"
                      />
                    )
                  ))
                )}

                {isCustomPlan && (
                  <RateupButtonPrimary
                    title="Upgrade plan"
                    onClick={openCustom}
                  />
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
                    {checkExpiry(subscription?.expiresAt) &&
                    !isProcessingPlan ? (
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
                    {(subscription?.basePlan?.paymentPlan?.period ||
                      subscription?.basePlan?.stripeProduct?.interval) ??
                      "----"}
                  </Title>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    Plan Cost
                  </Text>
                  <Title order={5}>
                    {subscription?.basePlan?.paymentPlan?.amount
                      ? `₹${subscription.basePlan.paymentPlan.amount}`
                      : subscription?.basePlan?.stripeProduct?.amount
                        ? `$${subscription.basePlan.stripeProduct.amount}`
                        : "----"}
                  </Title>
                </Stack>
              </Group>
              {!isCustomPlan && !isProcessingPlan && (
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
                      <>
                        {/* <RateupButtonPrimary title="Buy Addons" disabled /> */}
                      </>
                    )
                  ) : null}
                </Group>
              )}

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

      <FormModalLayout
        opened={cancelResult}
        onClose={closeCancelResult}
        centered
        title="Subscription Cancelled !"
        size="auto"
      >
        <Stack justify="center" mt="xl" mb="-20px">
          <Text c="dimmed">
            Your current Rateup plan subscription is successfully cancelled.{" "}
            <br /> <br /> You can still enjoy the premium features until the
            validity expires.
            <br />
            Also your existing base plan benefits will be replaced on an
            upgrade.
          </Text>
          <Group mb="50" mt="md">
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
      </FormModalLayout>

      <FormModalLayout
        opened={customUpgradeModal}
        onClose={closeCustomModal}
        centered
        title="Upgrade Custom Plan"
        size="auto"
      >
        <Stack justify="center" mt="xl" mb="-20px">
          <Text c="dimmed">
            {" "}
            For Upgrading your Custom Plan, <br />
            Connect Rateup billing team via email.
          </Text>
          <Group mb="50" mt="md">
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
      </FormModalLayout>
    </>
  );
};

export default Billing;
