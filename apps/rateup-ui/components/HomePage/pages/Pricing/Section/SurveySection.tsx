import React, { useEffect } from "react";
import { Box, Flex, Stack } from "@mantine/core";
import PricingCard from "../Card/PricingCard";
import PlanCard from "../Card/PlanCard";
import { PlanCardWidth } from "../Utils/constants";

export const SurveySection = ({
  largeScreen,
  handlePlanSelection,
  plans,
  currencySymbol,
}) => {
  const surveyPlan = plans
    ?.filter((item) => !item?.name?.includes("Menu"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  if (surveyPlan?.length > 0) {
    surveyPlan?.push({
      displayName: "Enterprise",
      paymentPlan: {
        amount: "Lets Talk!",
        currency: "",
        period: "",
      },
    });
  }
  const inversePeriod =
    surveyPlan?.[0]?.paymentPlan?.period === "yearly" ? "Monthly" : "Yearly";

  return (
    <Flex justify={"center"} gap={"xl"} wrap={"wrap"} my={"lg"}>
      {surveyPlan?.map((data, index) => {
        return (
          <Stack align="center" gap={0} pos={"relative"} key={data?.id}>
            <Box
              bg={"#1C518E"}
              c={"white"}
              py={"8px"}
              px={"xl"}
              ta={"center"}
              style={{
                borderRadius: "15px",
              }}
              w={PlanCardWidth}
              display={index === 1 ? "block" : "none"}
            >
              Most Popular
            </Box>
            <PlanCard
              currencySymbol={currencySymbol}
              data={data}
              handlePlanSelection={handlePlanSelection}
              index={index}
              inversePeriod={inversePeriod}
              largeScreen={largeScreen}
            />
          </Stack>
        );
      })}
    </Flex>
  );
};
