import { useMediaQuery } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useRateupPaymentsPlans } from "@/backend/payment/payment.query";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";

import { MotionTransition } from "../../../animation/MotionTransition.tsx";
import RateupLoader from "../../../Loaders/RateupLoader.tsx";
import { CustomSection } from "./Section/CustomSection.tsx";
import { SurveySection } from "./Section/SurveySection.tsx";
import { WhatsAppSection } from "./Section/WhatsAppSection.tsx";
import { useRouteAndCartStore } from "./store/RouteAndCartStore.ts";

const Pricing = ({ isAccount = false, handleSelection = () => {}, source = "WebSurveys" }) => {
  const [value, setValue] = useState(source);
  const [checked] = useState(false);
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const extraLargeScren = useMediaQuery("(min-width: 88em)");
  const { updateRouteAndCart } = useRouteAndCartStore();
  const navigate = useNavigate();
  const { data, isPending } = useRateupPaymentsPlans();

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currency = userTimeZone === "Asia/Calcutta" ? "INR" : "USD";
  const currencySymbol = userTimeZone === "Asia/Calcutta" ? "₹" : "$";

  // const currency = "USD";
  // const currencySymbol = "$";

  // let currency = "INR";
  // let currencySymbol = "₹";

  // if (gateway === "stripe") {
  //   //temp for stripe testing
  //   currency = "USD";
  //   currencySymbol = "$";
  // }

  // if (gateway === "razorpay") {
  //   //for optional switching of gateway for NRIs
  //   currency = "INR";
  //   currencySymbol = "₹";
  // }

  const session = useCheckSession();

  const handlePlanSelection = (data) => {
    let route = "/dashboard/settings/billing";
    updateRouteAndCart(route, data);
    if (isAccount) return handleSelection();
    if (!session) route = "/login";
    navigate({
      to: route,
    });
  };
  if (isPending) return <RateupLoader />;

  const freePlan = session ? [] : data?.filter((plan) => plan?.displayName?.includes("FREE"));

  const plans = data?.filter((item) => {
    if (item?.paymentPlan) {
      return (
        item?.paymentPlan?.period === (checked ? "yearly" : "monthly") &&
        item?.paymentPlan?.currency === currency
      );
    } else {
      return (
        item?.stripeProduct?.interval === (checked ? "year" : "month") &&
        item?.stripeProduct?.currency?.toUpperCase() === currency
      );
    }
  });
  const inversePlans = data?.filter((item) => {
    if (item?.paymentPlan) {
      return (
        item?.paymentPlan?.period === (!checked ? "yearly" : "monthly") &&
        item?.paymentPlan?.currency === currency
      );
    } else {
      return (
        item?.stripeProduct?.interval === (!checked ? "year" : "month") &&
        item?.stripeProduct?.currency?.toUpperCase() === currency
      );
    }
  });

  const updatedPlans = plans?.map((plan) => {
    const correspondingInversePlan = inversePlans?.find(
      (inversePlan) => inversePlan?.displayName?.toLowerCase() === plan?.displayName?.toLowerCase(),
    );

    if (correspondingInversePlan) {
      return {
        ...plan,
        inverse: correspondingInversePlan?.paymentPlan?.amount,
      };
    }

    return plan;
  });

  return (
    <div
      className="mb-[60px] flex flex-col items-center gap-4 font-medium"
      style={{ marginTop: isAccount ? 0 : 30 }}
    >
      <div className="text-center" style={{ display: isAccount ? "none" : "block" }}>
        <p
          style={{
            color: "var(--grey-color-4)",
            fontSize: "clamp(14px, 9.008px + 0.833vw, 21.008px)",
          }}
        >
          Our Pricing Plans
        </p>
        <p
          style={{
            color: "var(--tertiary-color)",
            fontSize: "clamp(24px, 15.424px + 1.429vw, 36px)",
          }}
        >
          Choose what you need
        </p>
      </div>
      {source === "WebSurveys" && (
        <div
          className="grid grid-cols-1 xl:grid-cols-3"
          style={{ gap: extraLargeScren ? "80px" : "40px" }}
        >
          <div className={extraLargeScren ? "block" : "hidden"} />
          <ToggleGroup
            variant="outline"
            value={[value]}
            onValueChange={(next) => next && next.length > 0 && setValue(next[0])}
          >
            <ToggleGroupItem value="WebSurveys">Web Survey</ToggleGroupItem>
            <ToggleGroupItem value="WhatsApp">WhatsApp</ToggleGroupItem>
            <ToggleGroupItem value="Custom">Custom</ToggleGroupItem>
          </ToggleGroup>
          {/* <Flex align="center" pos={"relative"} gap={"xs"}>
            <Switch
              color={"var(--shade-of-blue-5)"}
              classNames={classes}
              checked={checked}
              onChange={(event) => setChecked(event.currentTarget.checked)}
              size="lg"
            />
            <Image
              src={"/images/subscriptionArrow.png"}
              h={32}
              w={67}
              pos={"absolute"}
              bottom={"40px"}
              left={"40px"}
              alt="image of arrow"
            />
            <Stack gap={0} fz={"clamp(14px, 12.576px + 0.238vw, 16px)"}>
              <Text c={"var(--light-grey-color-5)"}>Subscribe Annually</Text>
              <Text c={"var(--shade-of-blue-5"}>
                Save Upto {DISCOUNT_PERCENTAGE} Months
              </Text>
            </Stack>
          </Flex> */}
        </div>
      )}

      <MotionTransition keyValue={{ id: value }} type="bottomSlideIn">
        {value === "WebSurveys" && (
          <SurveySection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            freePlan={freePlan}
            currencySymbol={currencySymbol}
          />
        )}

        {value === "WhatsApp" && (
          <WhatsAppSection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            freePlan={freePlan}
            currencySymbol={currencySymbol}
          />
        )}

        {value === "Custom" && (
          <CustomSection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            plans={updatedPlans}
            currencySymbol={currencySymbol}
          />
        )}
      </MotionTransition>
    </div>
  );
};

export default Pricing;
