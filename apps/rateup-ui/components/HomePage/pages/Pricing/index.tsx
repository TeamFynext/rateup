"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box,
  Flex,
  Image,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { useRateupPaymentsPlans } from "../../../../backend/payment/payment.query";
import { useCheckSession } from "../../../../hooks/checkSession";
import { MotionTransition } from "../../../animation/MotionTransition";
import RateupLoader from "../../../Loaders/RateupLoader";
import classes from "./Pricing.module.css";
import { CustomSection } from "./Section/CustomSection";
import { MenuSection } from "./Section/MenuSection";
import { SurveySection } from "./Section/SurveySection";
import { WhatsAppSection } from "./Section/WhatsAppSection";
import { useRouteAndCartStore } from "./store/RouteAndCartStore";
import { DISCOUNT_PERCENTAGE } from "./Utils/constants";

const Pricing = ({
  isAccount = false,
  handleSelection = () => {},
  source = "WebSurveys",
}) => {
  const [value, setValue] = useState(source);
  const [checked, setChecked] = useState(false);
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const extraLargeScren = useMediaQuery("(min-width: 88em)");
  const { updateRouteAndCart } = useRouteAndCartStore();
  const router = useRouter();
  const { data, isPending, isError } = useRateupPaymentsPlans();

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let currency = userTimeZone === "Asia/Calcutta" ? "INR" : "USD";
  let currencySymbol = userTimeZone === "Asia/Calcutta" ? "₹" : "$";

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
    let route = "/dashboard/settings?tab=account";
    updateRouteAndCart(route, data);
    if (isAccount) return handleSelection();
    if (!session) route = "/login";
    router.push(route);
  };
  if (isPending) return <RateupLoader />;

  const freePlan = session
    ? []
    : data?.filter(
        (plan) =>
          plan?.displayName?.includes("FREE") &&
          (source === "Digital Menu") === plan?.name?.includes("MENU"),
      );

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
      (inversePlan) =>
        inversePlan?.displayName?.toLowerCase() ===
        plan?.displayName?.toLowerCase(),
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
    <Stack mt={isAccount ? 0 : 30} align="center" fw={500} mb={60}>
      <Box ta={"center"} display={isAccount ? "none" : "block"}>
        <Text
          c={"var(--grey-color-4)"}
          fz={"clamp(14px, 9.008px + 0.833vw, 21.008px)"}
        >
          Our Pricing Plans
        </Text>
        <Text
          c={"var(--tertiary-color)"}
          fz={"clamp(24px, 15.424px + 1.429vw, 36px)"}
        >
          Choose what you need
        </Text>
      </Box>
      {source === "WebSurveys" && (
        <SimpleGrid
          cols={{ base: 1, xl: 3 }}
          spacing={extraLargeScren ? "80px" : "40px"}
        >
          <Box display={extraLargeScren ? "block" : "none"} />
          <SegmentedControl
            value={value}
            color="var(--shade-of-blue-7)"
            onChange={setValue}
            classNames={classes}
            fw={500}
            data={[
              { label: "Web Survey", value: "WebSurveys" },
              { label: "WhatsApp", value: "WhatsApp" },
              { label: "Custom", value: "Custom" },
            ]}
          />
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
        </SimpleGrid>
      )}

      <MotionTransition keyValue={{ id: value }} type="bottomSlideIn">
        {value === "WebSurveys" && (
          <SurveySection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            plans={updatedPlans}
            freePlan={freePlan}
            currencySymbol={currencySymbol}
          />
        )}
        {value === "Digital Menu" && (
          <MenuSection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            plans={updatedPlans}
            freePlan={freePlan}
            currencySymbol={currencySymbol}
          />
        )}

        {value === "WhatsApp" && (
          <WhatsAppSection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            plans={updatedPlans}
            freePlan={freePlan}
            currencySymbol={currencySymbol}
          />
        )}

        {value === "Custom" && (
          <CustomSection
            largeScreen={largeScreen}
            handlePlanSelection={handlePlanSelection}
            plans={updatedPlans}
            freePlan={freePlan}
            currencySymbol={currencySymbol}
          />
        )}
      </MotionTransition>
    </Stack>
  );
};

export default Pricing;
