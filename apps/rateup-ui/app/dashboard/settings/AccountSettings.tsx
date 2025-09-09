"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Blockquote,
  Group,
  ScrollAreaAutosize,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import {
  useCreateCheckoutSession,
  useUpdateSubscriptionOrder,
  useUserOrgOrders,
} from "../../../backend/payment/payment.query";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { generateListItems } from "../../../components/HomePage/pages/Pricing/Card/PricingCard";
import { useRouteAndCartStore } from "../../../components/HomePage/pages/Pricing/store/RouteAndCartStore";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { checkExpiry } from "../../../components/Premium/ExpiryComponent";
import { useUser } from "../../../context/UserContext";
import Billing from "./Billing";
import OrderHistory from "./OrderHistory";
import UsageStats from "./UsageStats";

export enum AccountSettingsTabs {
  UsageStats = "Usage Stats",
  Billing = "Billing",
  OrderHistory = "Order History",
}

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

  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const createCheckout = useCreateCheckoutSession(setIsLoading, setOrder);
  const { user } = useUser();
  const router = useRouter();
  const translations = useTranslations();
  const {
    data: subscription,
    isPending,
    refetch,
    isRefetching,
  } = useSubscription();
  const {
    data: orders,
    refetch: refreshOrders,
    isRefetching: isRefetchOrders,
  } = useUserOrgOrders();
  const updateOrderMut = useUpdateSubscriptionOrder(order?.id);

  const [activeOrderData, setActiveOrderData] = useState(null);
  const [latestOrderData, setLatestOrderData] = useState(null);

  const [activeTab, setActiveTab] = useState<AccountSettingsTabs>(
    AccountSettingsTabs.UsageStats,
  );
  const [isAnnualMessageLimit, setIsAnnualMessageLimit] = useState(false);

  useEffect(() => {
    let order = orders?.data?.filter(
      (o) => o.subscriptionId === subscription?.subscriptionRef,
    );
    order?.length > 0 && setActiveOrderData(order[0]);

    let sorted = orders?.data?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    sorted?.length && setLatestOrderData(sorted[0]);
  }, [subscription, orders]);

  useEffect(() => {
    close();
    refetch();
    refreshOrders();
  }, [summaryView, activeTab]);
  const searchParams = useSearchParams();

  useEffect(() => {
    //route params used in email body & redirecting pages
    if (searchParams.get("view") === "billing")
      setActiveTab(AccountSettingsTabs.Billing);
    if (searchParams.get("view") === "myOrders")
      setActiveTab(AccountSettingsTabs.OrderHistory);
    if (searchParams.get("view") === "stats")
      setActiveTab(AccountSettingsTabs.UsageStats);
  }, [searchParams]);

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
    isAnnualMessageLimit,
    trialDays: cart?.trialDays,
  };

  async function displayRazorpay() {
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js",
    );

    if (!res) {
      alert(translations("Razropay failed to load!!"));
      return;
    }

    if (order?.subscriptionId && selectedRateupPlan) {
      var options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_API_KEY,
        subscription_id: order?.subscriptionId,
        name: translations("RateUp Payment"),
        description: "Subscription Plans in Rateup",
        image: "https://djd7kjh9uwow0.cloudfront.net/images/logo.svg",
        handler: function (response) {
          console.log(translations("Payment Successful!"));
          setProcessingPayment(false);
          if (order.hasTrial) {
            updateOrderMut.mutate({
              status: "COMPLETE",
              paymentStatus: "SUCCESS",
              subscriptionStatus: "authenticated",
            });
          } else {
            refreshOrders();
          }
          openSummary();

          //alert("Payment Successful!");
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

  const isSubscriber = () => {
    return (
      checkExpiry(subscription?.expiresAt) ||
      subscription?.basePlan?.name === "RATEUP TRIAL" ||
      subscription?.basePlan?.name === "FREE PLAN"
    );
  };

  let enablePurchase =
    isSubscriber() || activeOrderData?.subscriptionStatus === "cancelled";

  return (
    <>
      <Tabs
        keepMounted={false}
        styles={{ tab: { fontSize: "18px", borderBottomWidth: "3px" } }}
        value={activeTab}
        onChange={(value) => setActiveTab(value as AccountSettingsTabs)}
        px={"md"}
      >
        <Tabs.List w={"fit-content"}>
          {Object.values(AccountSettingsTabs).map((tab) => (
            <Tabs.Tab
              value={tab}
              key={tab}
              c={activeTab === tab ? "var(--tertiary-color)" : "GrayText"}
            >
              {tab}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <ScrollAreaAutosize h={"70vh"} scrollbarSize={7}>
          <Tabs.Panel
            value={AccountSettingsTabs.UsageStats}
            py={"xl"}
            px={"lg"}
          >
            <UsageStats subscription={subscription} />
          </Tabs.Panel>
          <Tabs.Panel value={AccountSettingsTabs.Billing} py={"xl"} px={"lg"}>
            <Billing
              subscription={subscription}
              activeOrderData={activeOrderData}
              latestOrderData={latestOrderData}
              processingPayment={processingPayment}
              refetch={refetch}
              refreshOrders={refreshOrders}
              isRefetching={isRefetching}
            />
          </Tabs.Panel>
          <Tabs.Panel
            value={AccountSettingsTabs.OrderHistory}
            py={"xl"}
            px={"lg"}
          >
            <OrderHistory
              orders={orders?.data}
              refetch={refreshOrders}
              isRefetching={isRefetchOrders}
            />
          </Tabs.Panel>
        </ScrollAreaAutosize>
      </Tabs>

      {/*....... Order confirmation Modal ......*/}
      <FormModalLayout
        opened={opened}
        onClose={() => {
          close();
          reset();
        }}
        centered
        title={
          enablePurchase
            ? translations("Confirm your Order")
            : translations("Buy Rateup Premium")
        }
        buttonTitle={enablePurchase && translations("Continue to Payment")}
        includeCancelButton={enablePurchase}
        isLoading={isLoading}
        size="auto"
        cancelOnClick={() => {
          close();
          reset();
        }}
        onSubmit={() => {
          if (cart.gateway === "STRIPE") {
            close();
            router.push(`/dashboard/payment/checkout?pid=${cart.priceId}`);
          } else {
            setProcessingPayment(true);
            createCheckout.mutate(checkoutDetails, {
              onSettled: (data) => {
                setIsAnnualMessageLimit(false);
              },
            });
            close();
            reset();
          }
        }}
      >
        {enablePurchase ? (
          <Group mt="xl" mb="40px" justify="space-between">
            <Stack mr="xl">
              {cart?.period === "yearly" && (
                <Switch
                  label={"Annual Message limit"}
                  checked={isAnnualMessageLimit}
                  onChange={(e) =>
                    setIsAnnualMessageLimit(e.currentTarget.checked)
                  }
                />
              )}
              <Title order={3}> {cart?.name} </Title>
              <Title order={5}>
                {cart?.currencySymbol}
                {cart?.amount} /{cart?.period}
              </Title>
            </Stack>
            <Stack mr="xl">
              <Title order={5}>{translations("Plan Features")} </Title>
              {cart?.description && generateListItems(cart?.description)}
            </Stack>
          </Group>
        ) : (
          <Stack mt="xl" style={{ maxWidth: "500px" }}>
            <Blockquote color="blue" icon={<IconInfoCircle />} mt="lg">
              <Text>
                {" "}
                {translations(
                  "You have an active Base Plan already So you cannot buy another Rateup base plan But you can buy the available ADDON RateUp plan to get more features",
                )}
              </Text>
            </Blockquote>

            <Group ml="xl" my="xl">
              <Title order={4} style={{ minWidth: "140px" }}>
                {translations("Current Plan :")}
              </Title>
              <Text> {subscription?.basePlan?.name} </Text>
            </Group>

            <RateupButtonPrimary title="Buy Addons" />
          </Stack>
        )}
      </FormModalLayout>

      {/*....... Order summary Modal ......*/}
      <FormModalLayout
        opened={summaryView}
        onClose={() => {
          closeSummary();
          reset();
        }}
        centered
        title={translations("Order Processing Started 🎉")}
        buttonTitle={translations("Continue")}
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
              {translations("Your payment was successful!")}
            </Text>
            <Text>
              {translations(
                "Thank you for choosing Rateup Premium subscription",
              )}
              <br /> <br />
              {translations(
                "You can enjoy Rateup Premium features once your order is processed successfully",
              )}
              <br />
              {translations("You will be notified by email shortly")}
            </Text>
          </Stack>
        </Group>
      </FormModalLayout>
    </>
  );
};

export default AccountSettings;
