import { Box, Flex, Stack, Text } from "@mantine/core";
import React from "react";

import PlanCard from "../Card/PlanCard.tsx";
import { PlanCardWidth } from "../Utils/constants.ts";

export const SurveySection = ({ largeScreen, handlePlanSelection, freePlan, currencySymbol }) => {
  const surveyPlan = [] // plans, removing for now
    ?.filter((item) => {
      const name = item?.name;
      return (
        name && !name.includes("Menu") && !name.includes("WhatsApp") && !name.includes("Custom")
      );
    })
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  surveyPlan?.push({
    displayName: "Enterprise",
    paymentPlan: {
      amount: "Lets Talk!",
      currency: "",
      period: "",
    },
  });

  if (freePlan?.length > 0) {
    freePlan[0].paymentPlan = {
      amount: 0,
      currency: "",
      period: surveyPlan?.[0]?.paymentPlan?.period === "yearly" ? "yearly" : "monthly",
    };
  }
  const surveyPlans = [...freePlan, ...surveyPlan];

  return (
    <Flex justify={"center"} gap={"xl"} wrap={"wrap"} my={"lg"}>
      {surveyPlans?.map((data, index) => {
        let isPopular = false;
        isPopular = data?.displayName && data?.displayName.toLowerCase().includes("team");

        return (
          <Stack align="center" gap={0} pos={"relative"} key={data?.id}>
            <Box
              bg={"#1C518E"}
              c={"white"}
              py={"10px"}
              px={"xl"}
              ta={"center"}
              style={{
                borderRadius: "15px 15px 0 0",
                marginBottom: "",
                zIndex: 2,
              }}
              w={PlanCardWidth}
              display={isPopular ? "block" : "none"}
            >
              <Text pb="xs" mt="-4px" size="sm">
                {" "}
                Most Popular{" "}
              </Text>
            </Box>
            <PlanCard
              currencySymbol={currencySymbol}
              data={data}
              handlePlanSelection={handlePlanSelection}
              index={index}
              totalItems={surveyPlans?.length}
              largeScreen={largeScreen}
              isPopular={isPopular}
            />
          </Stack>
        );
      })}
    </Flex>
  );
};
