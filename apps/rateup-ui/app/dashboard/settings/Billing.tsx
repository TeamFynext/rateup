"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { useDisclosure, useElementSize } from "@mantine/hooks";
import {
  IconCheck,
  IconInfoCircle,
  IconMail,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useCancelRazorpaySubscriptionMutation } from "@/backend/payment/payment.query";
import { useCancelStripeSubscriptionMutation } from "@/backend/payment/stripe/stripe.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import Pricing from "@/components/HomePage/pages/Pricing";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { checkExpiry } from "@/components/Premium/ExpiryComponent";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { formatIsoDateString } from "@/utils/dateTime";
import { showLoadingToast, showSuccessToast } from "@/utils/notifications";

import classes from "./setting.module.css";

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
  const [isShopifyPlan, setIsShopifyPlan] = useState(false);

  useEffect(() => {
    if (
      subscription?.basePlan?.name &&
      subscription.basePlan.name.toUpperCase().includes("CUSTOM")
    ) {
      setIsCustomPlan(true);
    } else {
      setIsCustomPlan(false);
    }
    if (subscription?.shopifyPlanId) setIsShopifyPlan(true);
    else setIsShopifyPlan(false);
  }, [subscription?.basePlan?.name]);

  useEffect(() => {
    setIsProcessingPlan(latestOrderData?.subscriptionStatus === "pending");
  }, [latestOrderData?.subscriptionStatus]);

  const [cancelDialogOpened, { open, close }] = useDisclosure();
  const CancelRazorpaySubscription = useCancelRazorpaySubscriptionMutation();
  const CancelStripeSubscription = useCancelStripeSubscriptionMutation();
  const translations = useTranslations();
  const { ref, width } = useElementSize();
  const router = useRouter();
  const handleCancelSubscription = () => {
    showLoadingToast(
      translations("Hold your subscription is getting cancelled"),
      "load-data",
      true,
      translations("Cancelling Subscription"),
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
                  {translations("Your plan activation is under process")} <br />{" "}
                  {translations(
                    "You will receive activation status via email shortly",
                  )}{" "}
                  <br />
                  {translations("Usually takes between 30seconds to 15 mins")}
                </Text>
                <RateupButtonPrimary
                  title={translations("Refresh Status")}
                  onClick={handleRefresh}
                  rightIcon={<IconRefresh />}
                  disabled={isRefetching}
                />
              </Group>
            </Blockquote>
          )}

          <Group>
            <Title order={4}>Current Plan</Title>
            <Tooltip label={translations("Refresh data")}>
              <ActionIcon
                variant="light"
                aria-label="Settings"
                onClick={async () => {
                  showLoadingToast(
                    translations("Hold ondata getting updated"),
                    "subscription",
                    true,
                    translations("Refreshing"),
                  );
                  await handleRefresh();
                  showSuccessToast(
                    translations("Updated Succesfully"),
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
            headerLabel={translations(
              "Are you sure you want to cancel your active subscription?",
            )}
            headerTitle={translations("Cancel Subscription")}
            confirmLabel={translations("Confirm Cancel")}
            closeLabel={translations("Close ")}
            onConfirm={handleCancelSubscription}
            includeEmailConfirmation={true}
          />
          <PaperLayout w={"60%"} p={"xl"}>
            <Stack gap={"xl"} ref={ref}>
              <Group justify="space-between">
                <Stack gap={1} style={{ minWidth: "230px" }}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    {translations("Plan Name")}
                  </Text>
                  <Group gap={"xs"}>
                    <Title order={5}>{subscription?.basePlan?.name}</Title>
                    {latestOrderData?.subscriptionStatus ===
                      "authenticated" && (
                      <Text size="sm" c={"red"}>
                        ( Trial Period )
                      </Text>
                    )}
                  </Group>
                </Stack>
                {activeOrderData?.subscriptionChargeAt &&
                  activeOrderData?.subscriptionStatus !== "cancelled" &&
                  !isCustomPlan && (
                    <Stack gap={1}>
                      <Text c={"GrayText"} fw={500} fz={15}>
                        {translations("Next Charging on:")}
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
                        {translations("Cancelled on:")}
                      </Text>
                      <Title order={5}>
                        {formatIsoDateString(
                          activeOrderData?.subscriptionEndedAt,
                        )}
                      </Title>
                    </Stack>
                  )}

                {subscription?.basePlan?.name === "RATEUP TRIAL" ||
                (subscription?.basePlan?.name.includes("FREE") &&
                  !isCustomPlan &&
                  !isProcessingPlan) ? (
                  <RateupButtonPrimary
                    title={translations("Upgrade plan")}
                    onClick={() => router.push("/pricing")}
                  />
                ) : (
                  subscription?.basePlan?.name &&
                  (activeOrderData?.subscriptionStatus === "cancelled" &&
                  !isCustomPlan ? (
                    <RateupButtonPrimary
                      title={translations("Cancelled")}
                      onClick={() => {}}
                      disabled
                    />
                  ) : (
                    !isCustomPlan &&
                    !isProcessingPlan &&
                    !isShopifyPlan && (
                      <RateupButtonPrimary
                        title={translations("Cancel Subscription")}
                        onClick={open}
                        color="red"
                      />
                    )
                  ))
                )}

                {isCustomPlan && (
                  <RateupButtonPrimary
                    title={translations("Upgrade plan")}
                    onClick={openCustom}
                  />
                )}
              </Group>
              <Group justify="space-between">
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    {subscription?.basePlan?.paymentPlanId
                      ? "Next Due"
                      : translations("Validity")}
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
                        ? translations("Expired")
                        : translations("Active")}
                    </Badge>
                    {checkExpiry(subscription?.expiresAt) &&
                    !isProcessingPlan ? (
                      <RateupButtonPrimary
                        title={translations("Upgrade plan")}
                        onClick={toggle}
                      />
                    ) : null}
                  </Group>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    {translations("Billing Cycle")}
                  </Text>
                  <Title order={5}>
                    {(subscription?.basePlan?.paymentPlan?.period ||
                      subscription?.basePlan?.stripeProduct?.interval) ??
                      (isShopifyPlan ? "Monthly" : "----")}
                  </Title>
                </Stack>
                <Stack gap={1}>
                  <Text c={"GrayText"} fw={500} fz={15}>
                    {translations("Plan Cost")}
                  </Text>
                  {isShopifyPlan ? (
                    <Link href={"https://admin.shopify.com/"} target="_blank">
                      See in Shopiy
                    </Link>
                  ) : (
                    <Title order={5}>
                      {subscription?.basePlan?.paymentPlan?.amount
                        ? `${subscription?.basePlan?.paymentPlan?.currency} ${subscription.basePlan.paymentPlan.amount}`
                        : subscription?.basePlan?.stripeProduct?.amount
                          ? `$${subscription.basePlan.stripeProduct.amount}`
                          : "----"}
                    </Title>
                  )}
                </Stack>
              </Group>
              {!isCustomPlan && !isProcessingPlan && (
                <Group justify="space-between">
                  <Stack gap={1}>
                    <Text c={"GrayText"} fw={500} fz={15}>
                      {translations("Addons")}
                    </Text>
                    <Title order={5}>{translations("Nil")}</Title>
                  </Stack>
                  {!["FREE PLAN", "RATEUP TRIAL"].includes(
                    subscription?.basePlan?.name,
                  ) ? (
                    activeOrderData?.subscriptionStatus === "cancelled" ? (
                      <RateupButtonPrimary
                        title={translations("Upgrade plan")}
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
                  {translations("*For Custom Plans / Support / Assistance")}
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
        title={translations("Upgrade Your Plan")}
        size="auto"
      >
        <Pricing isAccount={true} handleSelection={closeUpgradeModal} />
      </FormModalLayout>

      <FormModalLayout
        opened={cancelResult}
        onClose={closeCancelResult}
        centered
        title={translations("Subscription Cancelled !")}
        size="auto"
      >
        <Stack justify="center" mt="xl" mb="-20px">
          <Text c="dimmed">
            {translations(
              "Your current Rateup plan subscription is successfully cancelled",
            )}
            <br /> <br />{" "}
            {translations(
              "You can still enjoy the premium features until the validity expires",
            )}
            <br />
            {translations(
              "Also your existing base plan benefits will be replaced on an upgrade",
            )}
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
        title={translations("Upgrade Custom Plan")}
        size="auto"
      >
        <Stack justify="center" mt="xl" mb="-20px">
          <Text c="dimmed">
            {" "}
            {translations("For Upgrading your Custom Plan,")} <br />
            {translations("Connect Rateup billing team via email")}
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
