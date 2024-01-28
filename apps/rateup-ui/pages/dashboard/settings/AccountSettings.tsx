import {
  Flex,
  Title,
  Group,
  Text,
  Stack,
  Box,
  Blockquote,
} from "@mantine/core";
import React, { useEffect, useState } from "react";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import {
  useCreateCheckoutSession,
  useUserOrgOrders,
} from "../../../backend/payment/payment.query";
import { useUser } from "../../../context/UserContext";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import Pricing from "../../../components/HomePage/pages/Pricing";
import { useRouteAndCartStore } from "../../../components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { generateListItems } from "../../../components/HomePage/pages/Pricing/Card/PricingCard";
import OrderHistory from "./OrderHistory";
import Billing from "./Billing";
import dayjs from "dayjs";
import { checkExpiry } from "../../../components/Premium/ExpiryComponent";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { IconInfoCircle } from "@tabler/icons-react";

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

const AccountSettings = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [summaryView, { open: openSummary, close: closeSummary }] =
    useDisclosure(false);

  const [openedUpgradeModal, { toggle, close: closeUpgradeModal }] =
    useDisclosure(false);

  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const createCheckout = useCreateCheckoutSession(setIsLoading, setOrder);
  const { user } = useUser();

  const { data: subscription, isPending } = useSubscription();
  const { data: orders, refetch: refreshOrders } = useUserOrgOrders();

  const { cart, reset } = useRouteAndCartStore();
  const [selectedRateupPlan, setselectedRateupPlan] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  //data to be recevied from pricing page

  const checkoutDetails = {
    planId: cart?.planId,
    rateupPlanId: cart?.id,
    planName: cart?.name,
    period: cart?.period,
    orgId: user?.orgId,
  };

  async function displayRazorpay() {
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js",
    );

    if (!res) {
      alert("Razropay failed to load!!");
      return;
    }

    if (order?.subscriptionId && selectedRateupPlan) {
      var options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_API_KEY,
        subscription_id: order?.subscriptionId,
        name: "RateUp Payment",
        description: "Subscription Plans in Rateup",
        image: "https://djd7kjh9uwow0.cloudfront.net/images/logo.svg",
        handler: function (response) {
          console.log("Payment Successful...!");
          setProcessingPayment(false);
          openSummary();
          refreshOrders();
          //alert("Payment Successful...!");
        },
        prefill: {
          name: user?.userName,
          email: user?.email,
          contact: user?.orgPhone,
        },
        notes: {
          rateupOrderId: order?.id,
          rateupPlanId: selectedRateupPlan,
          subId: order?.subscriptionId,
          orgId: user?.orgId,
          subExpiry: dayjs
            .unix(order?.subExpiry)
            .format("YYYY-MM-DDTHH:mm:ss.sssZ"),
        },
        theme: {
          color: "#1C518E",
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            setselectedRateupPlan("");
          },
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    }
  }

  useEffect(() => {
    if (order) {
      displayRazorpay();
    }
  }, [order]);

  useEffect(() => {
    if (cart.id) {
      setselectedRateupPlan(cart?.id);
      open();
    }
  }, [cart.id]);

  const handleSelection = () => {
    closeUpgradeModal();
  };

  const isSubscriber = () => {
    return (
      checkExpiry(subscription?.expiresAt) ||
      subscription?.basePlan?.name === "RATEUP TRIAL"
    );
  };

  return (
    <Flex direction={"column"} h={"100%"}>
      <Billing
        subscription={subscription}
        toggle={toggle}
        processingPayment={processingPayment}
      />
      <OrderHistory orders={orders?.data} />

      {/*....... Order confirmation Modal ......*/}
      <FormModalLayout
        opened={opened}
        onClose={() => {
          close();
          reset();
        }}
        centered
        title={isSubscriber() ? "Confirm your Order" : "Buy Rateup Premium"}
        buttonTitle={isSubscriber() && "Continue to Payment"}
        includeCancelButton={isSubscriber()}
        isLoading={isLoading}
        size="auto"
        cancelOnClick={() => {
          close();
          reset();
        }}
        onSubmit={() => {
          setProcessingPayment(true);
          createCheckout.mutate(checkoutDetails);
          close();
          reset();
        }}
      >
        {isSubscriber() ? (
          <Group mt="xl" mb="40px" justify="space-between">
            <Stack mr="xl">
              <Title order={3}> {cart?.name} </Title>
              <Title order={5}>
                {cart?.currencySymbol}
                {cart?.amount} /{cart?.period}
              </Title>
            </Stack>
            <Stack mr="xl">
              <Title order={5}> Plan Features </Title>
              {cart?.description && generateListItems(cart?.description)}
            </Stack>
          </Group>
        ) : (
          <Stack mt="xl" style={{ maxWidth: "500px" }}>
            <Blockquote color="blue" icon={<IconInfoCircle />} mt="lg">
              <Text>
                {" "}
                You have an active Base Plan already. So you cannot buy another
                Rateup base plan. But you can buy the available ADDON rateup
                plan to get more features.
              </Text>
            </Blockquote>

            <Group ml="xl" my="xl">
              <Title order={4} style={{ minWidth: "140px" }}>
                Current Plan :
              </Title>
              <Text> {subscription?.basePlan?.name} </Text>
            </Group>

            <RateupButtonPrimary title="Buy Addons" />
          </Stack>
        )}
      </FormModalLayout>

      {/*....... Upgrade plan Modal ......*/}
      <FormModalLayout
        opened={openedUpgradeModal}
        onClose={closeUpgradeModal}
        centered
        title="Upgrade Your Plan"
        size="auto"
      >
        <Pricing isAccount={true} handleSelection={handleSelection} />
      </FormModalLayout>

      {/*....... Order summary Modal ......*/}
      <FormModalLayout
        opened={summaryView}
        onClose={() => {
          closeSummary();
          reset();
        }}
        centered
        title="Order Processing Started 🎉"
        buttonTitle="Continue"
        isLoading={isLoading}
        onSubmit={() => {
          closeSummary();
        }}
        size="auto"
      >
        <Group
          mt="md"
          justify="space-between"
          mb="xl"
          style={{ minWidth: "350px" }}
        >
          <Stack>
            <Text c="green" fw={500}>
              Your payment was successful..!
            </Text>
            <Text>
              Thank you for choosing Rateup Premium subscription. <br /> <br />{" "}
              You can enjoy Rateup Premium features once your order is processed
              successfully. <br />
              You will be notified by email shortly.
            </Text>
          </Stack>
        </Group>
      </FormModalLayout>

      <FormModalLayout
        opened={openedUpgradeModal}
        onClose={closeUpgradeModal}
        centered
        title="Upgrade Your Plan"
        size="auto"
      >
        <Box style={{ minHeight: "600px" }}>
          <Pricing isAccount={true} handleSelection={handleSelection} />
        </Box>
      </FormModalLayout>
    </Flex>
  );
};

export default AccountSettings;
