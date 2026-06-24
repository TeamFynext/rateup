import { Box, Flex, Stack, Text } from "@mantine/core";
import React from "react";

import PlanCard from "../Card/PlanCard.tsx";
import { PlanCardWidth } from "../Utils/constants.ts";

export const MenuSection = ({ largeScreen, handlePlanSelection, freePlan, currencySymbol }) => {
  const menuPlan = [] // plans, removing for now
    ?.filter((item) => item?.name?.includes("Menu"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  menuPlan?.push({
    displayName: "Business",
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
      period: menuPlan?.[0]?.paymentPlan?.period === "yearly" ? "yearly" : "monthly",
    };
  }

  const menuPlans = [...freePlan, ...menuPlan];

  return (
    <Stack my={"lg"}>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"}>
        {menuPlans?.map((data, index) => {
          let isPopular = false;
          isPopular = data?.displayName && data?.displayName.toLowerCase().includes("plus");

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
                totalItems={menuPlans.length}
                largeScreen={largeScreen}
                key={data.id}
                isPopular={isPopular}
              />
            </Stack>
          );
        })}
      </Flex>
    </Stack>
  );
};
