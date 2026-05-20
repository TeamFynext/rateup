import { Suspense, useEffect, useState } from "react";

import { Center, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconLoader } from "@tabler/icons-react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Session from "supertokens-auth-react/recipe/session";

import { useUserOrgOrders } from "@/backend/payment/payment.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import style from "@/components/Graph/graph.module.css";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";


export const Route = createFileRoute("/(marketing)/pricing/shopify/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifySubscriptionApprovalCallback />
    </Suspense>
  );
}

function ShopifySubscriptionApprovalCallback() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const charge_id = searchParams.charge_id;
  const shop = searchParams.shop;
  const plan = searchParams.plan;

  const { t: translations } = useTranslation();
  const [isSessionExist, setIsSessionExist] = useState(false);
  useEffect(() => {
    if (!charge_id || !shop || !plan) {
      navigate({
        to: "/login",
      });
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
        navigate({
          to: "/login",
        });
      }
      return isExist;
    };
    checkSession();
  }, []);

  const { data: orders, isFetching } = useUserOrgOrders(isSessionExist);
  const { data: subscription, isFetching: subscriptionFetching } =
    useSubscription(isSessionExist);

  const updateRoute = () => {
    localStorage.removeItem("shopify-subscription-callback");
    navigate({
      to: `/dashboard/settings/billing#order-history`,
    });
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
          <Text>
            {translations("Wait..Processing your subscription order")}
          </Text>
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
}
