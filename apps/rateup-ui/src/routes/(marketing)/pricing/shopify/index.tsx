import { IconArrowRight, IconLoader } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Session from "supertokens-auth-react/recipe/session";

import { useUserOrgOrders } from "@/backend/payment/payment.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button";

import style from "@/components/Graph/graph.module.css";

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
  const charge_id = typeof searchParams.charge_id === "string" ? searchParams.charge_id : undefined;
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
  const { data: subscription, isFetching: subscriptionFetching } = useSubscription(isSessionExist);

  const updateRoute = () => {
    localStorage.removeItem("shopify-subscription-callback");
    navigate({
      to: "/dashboard/settings/billing",
      hash: "order-history",
    });
  };

  const isSubscribtionUpdated = charge_id
    ? subscription?.subscriptionRef === charge_id.toString()
    : false;
  const isOrderCreated = orders
    ? orders.data?.find((order: { subscriptionId?: string }) => order.subscriptionId === charge_id)
    : false;

  if (!charge_id || !isSessionExist) return null;

  if (isFetching || subscriptionFetching)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <IconLoader className={style.rotateInfinitely} />
          <p>{translations("Wait..Processing your subscription order")}</p>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4 bg-muted p-8">
        {isSubscribtionUpdated ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="font-medium text-green-600">Your Subscription has been activated 🎉</p>
            <p>
              Thank you for choosing Rateup Premium subscription. <br /> <br /> You can now enjoy
              Rateup Premium features
              <br />
              You will be notified by email shortly.
            </p>
          </div>
        ) : isOrderCreated ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="font-medium text-green-600">Your Subscription Order has placed..!</p>
            <p>
              Thank you for choosing Rateup Premium subscription. <br /> <br /> You can enjoy Rateup
              Premium features once your order fully processed
              <br />
              You will be notified by email shortly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="font-medium text-green-600">Thank you for choosing Rateup..!</p>
            <p>Follow up your account page for order details and subscription status</p>
          </div>
        )}
        <Button onClick={() => updateRoute()}>
          {translations("Go to account setting")}
          <IconArrowRight />
        </Button>
      </div>
    </div>
  );
}
