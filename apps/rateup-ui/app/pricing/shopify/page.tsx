"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Center, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconLoader } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Session from "supertokens-auth-react/recipe/session";

import { useUserOrgOrders } from "@/backend/payment/payment.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import style from "@/components/Graph/graph.module.css";
import RateupLoader from "@/components/Loaders/RateupLoader";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifySubscriptionApprovalCallback />
    </Suspense>
  );
}

const ShopifySubscriptionApprovalCallback = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const charge_id = searchParams.get("charge_id");
  const shop = searchParams.get("shop");
  const plan = searchParams.get("plan");

  const translations = useTranslations();
  const [isSessionExist, setIsSessionExist] = useState(false);
  useEffect(() => {
    if (!charge_id || !shop || !plan) {
      router.push("/login");
      return;
    }
    const checkSession = async () => {
      const isExist = await Session.doesSessionExist();
      setIsSessionExist(isExist);
      if (!isExist) {
        localStorage?.setItem(
          "shopify-subscription-callback",
          `/pricing/shopify?plan=${plan}&charge_id=${charge_id}&shop=${shop}`,
        );
        router.push("/login");
      }
      return isExist;
    };
    checkSession();
  }, [router]);

  const { data: orders, isFetching } = useUserOrgOrders(isSessionExist);
  const { data: subscription, isFetching: subscriptionFetching } =
    useSubscription(isSessionExist);

  const updateRoute = () => {
    localStorage.removeItem("shopify-subscription-callback");
    router.push(`/dashboard/settings?tab=account&view=myOrders`);
  };

  const isSubscribtionUpdated = charge_id
    ? subscription?.subscriptionRef === charge_id.toString()
    : false;
  const isOrderCreated = orders
    ? orders.data?.find(
        (order) => order.subscriptionId === charge_id.toString(),
      )
    : false;

  if (!charge_id || !isSessionExist) return null;

  if (isFetching || subscriptionFetching)
    return (
      <Center h={"100vh"}>
        <Stack justify="center" align="center">
          <IconLoader className={style.rotateInfinitely} display={"block"} />
          <Text>{translations("WaitProcessing your subscription order")}</Text>
        </Stack>
      </Center>
    );

  return (
    <Center h={"100vh"}>
      <Stack
        justify="center"
        align="center"
        bg={
          "light-dark(var(--mantine-color-gray-3), var(--mantine-color-body))"
        }
        p={"xl"}
      >
        {isSubscribtionUpdated ? (
          <Stack justify="center" align="center">
            <Text c="green" fw={500}>
              Your Subscription has been activated 🎉
            </Text>
            <Text>
              Thank you for choosing Rateup Premium subscription. <br /> <br />{" "}
              You can now enjoy Rateup Premium features
              <br />
              You will be notified by email shortly.
            </Text>
          </Stack>
        ) : isOrderCreated ? (
          <Stack justify="center" align="center">
            <Text c="green" fw={500}>
              Your Subscription Order has placed..!
            </Text>
            <Text>
              Thank you for choosing Rateup Premium subscription. <br /> <br />{" "}
              You can enjoy Rateup Premium features once your order fully
              processed
              <br />
              You will be notified by email shortly.
            </Text>
          </Stack>
        ) : (
          <Stack justify="center" align="center">
            <Text c="green" fw={500}>
              Thank you for choosing Rateup..!
            </Text>
            <Text>
              Follow up your account page for order details and subscription
              status
            </Text>
          </Stack>
        )}
        <RateupButtonBlue
          title="Go to account setting"
          rightIcon={<IconArrowRight />}
          onClick={() => updateRoute()}
        />
      </Stack>
    </Center>
  );
};
