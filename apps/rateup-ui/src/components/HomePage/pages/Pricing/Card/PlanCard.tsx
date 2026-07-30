import { IconCircleCheck, IconX } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { gAnalyticsAndFbEvent } from "@/utils/gtag.ts";

import { Button } from "../../../../ui/button.tsx";
import { NumberAnimate } from "../Animate/NumberAnimate.tsx";
import type { Cart } from "../store/RouteAndCartStore.ts";
import type { PricingPlan } from "../types.ts";
import { PlanCardWidth, Title4 } from "../Utils/constants.ts";

import ButtonStyles from "./Button.module.css";
import styles from "./Modal.module.css";

const PlanCard = ({
  index,
  totalItems,
  currencySymbol,
  data,
  largeScreen,
  handlePlanSelection,
  isPopular = false,
}: {
  index: number;
  totalItems: number;
  currencySymbol: string;
  data: PricingPlan;
  largeScreen: boolean;
  handlePlanSelection: (cart: Cart) => void;
  isPopular?: boolean;
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [isStripe, setIsStripe] = useState(false);
  let cardMainColor = "linear-gradient(90deg, #387adf, #50c4ed)";

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  useEffect(() => {
    if (data?.stripeProduct?.amount) {
      setIsStripe(true);
    }
  }, [data]);

  const navigate = useNavigate();
  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  let marginTop = "32px";
  const title = `Subscribe Now`;

  if (isPopular) {
    marginTop = "-12px";
    cardMainColor = "linear-gradient(90deg, #004F98, #387ADF)";
  }

  return (
    <Card
      className="gap-0 border py-0 shadow-md"
      style={{
        width: PlanCardWidth,
        marginTop,
        minHeight: "100%",
        zIndex: 3,
        borderTopLeftRadius: isPopular ? "0px" : "15px",
        borderTopRightRadius: isPopular ? "0px" : "15px",
      }}
    >
      <div className="m-2 rounded-[5px]" style={{ background: cardMainColor }}>
        <div className="m-4 flex flex-col gap-0 pt-3 pb-4">
          <p style={{ fontSize: Title4 }} className="text-white">
            {data?.displayName}
          </p>

          <div className="flex items-center gap-2">
            <p className="text-lg font-medium text-white">
              {data?.paymentPlan?.period || data?.stripeProduct?.interval ? (
                <>
                  {currencySymbol}
                  <NumberAnimate
                    value={data?.paymentPlan?.amount || data?.stripeProduct?.amount || 0}
                  />
                  {(
                    !isStripe
                      ? data?.paymentPlan?.period === "monthly"
                      : data?.stripeProduct?.interval === "month"
                  )
                    ? " / month"
                    : " / year"}
                </>
              ) : (
                "Customized Plan & Pricing"
              )}
            </p>
          </div>
        </div>
      </div>
      {totalItems - 1 === index ? (
        <div className="flex h-full flex-col justify-around">
          <div
            className={`flex h-[80%] items-center justify-center ${
              largeScreen ? "mt-6 mb-8 pb-1.25" : "mt-2 mb-4"
            }`}
          >
            <p style={{ fontSize: "clamp(30px, 25.712px + 0.714vw, 36px)" }}>Lets Talk!</p>
          </div>
          <div className="mb-6 flex items-center justify-center">
            <Button
              className={ButtonStyles["button-hover"]}
              onClick={() => {
                gAnalyticsAndFbEvent(
                  "contact_sales",
                  "ContactSalesButtonClick",
                  "Clicked on Contact Sales button in the pricing page",
                );
                open();
              }}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between">
          <div className="mt-3 flex flex-col gap-1.25 p-0">
            {generateListItems(data?.description)}
          </div>

          <div className="mb-6 flex items-center justify-center">
            <Button
              className={ButtonStyles["button-hover"]}
              onClick={() => {
                gAnalyticsAndFbEvent(
                  "subscribe_pricing",
                  "SubscribeNowButtonClick",
                  "Clicked on subscribe now button in the pricing page",
                );
                if (data?.displayName.includes("FREE")) {
                  if (data?.name?.includes("MENU")) {
                    localStorage.setItem("selected_plan", JSON.stringify(data));
                  }
                  navigate({
                    to: "/signup",
                  });
                } else {
                  handlePlanSelection({
                    id: data?.id,
                    name: data?.displayName,
                    currency: data?.currency,
                    description: data?.description,
                    amount: data?.paymentPlan
                      ? data?.paymentPlan?.amount
                      : data?.stripeProduct?.amount,
                    currencySymbol: currencySymbol,
                    period: data?.paymentPlan
                      ? data?.paymentPlan?.period
                      : data?.stripeProduct?.interval,
                    gateway: data?.paymentPlan ? "RAZORPAY" : "STRIPE",
                    planId: data?.paymentPlan ? data?.paymentPlan?.planId : "",
                    priceId: data?.paymentPlan ? "" : data?.stripeProduct?.priceId,
                  });
                }
              }}
            >
              {title}
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={opened}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent className="w-screen max-w-screen">
          <DialogHeader>
            <DialogTitle>Contact Sales</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {isIframeLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-background/60 backdrop-blur-[2px]">
                <Spinner />
              </div>
            )}
            {opened && (
              <iframe
                title="Contact Sales form"
                onLoad={upadateLoadingStateOfIframe}
                className={styles["contact-form-iframe"]}
                src="https://rateup.app/ws/8hKp9bb9"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PlanCard;

const generateListItems = (listData: string[] = []) => (
  <ul className="flex flex-col">
    {listData.map((item) => {
      const isNegative = item.startsWith("-");
      const displayName = isNegative ? item.substring(1) : item;
      return (
        <li key={item} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-base">
            {isNegative ? (
              <IconX style={{ width: 16, height: 16, color: "red" }} />
            ) : (
              <IconCircleCheck style={{ width: 16, height: 16, color: "green" }} />
            )}
            <span>{displayName}</span>
          </div>
          <Separator className="my-4" />
        </li>
      );
    })}
  </ul>
);
