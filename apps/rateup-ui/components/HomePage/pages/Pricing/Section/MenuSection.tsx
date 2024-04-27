import React from "react";
import { Box, Flex, Stack, Text } from "@mantine/core";
import PlanCard from "../Card/PlanCard";
import { PlanCardWidth } from "../Utils/constants";

export const MenuSection = ({
  largeScreen,
  handlePlanSelection,
  plans,
  currencySymbol,
}) => {
  const menuPlan = plans
    ?.filter((item) => item?.name?.includes("Menu"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  if (menuPlan?.length > 0) {
    menuPlan?.push({
      displayName: "Business",
      paymentPlan: {
        amount: "Lets Talk!",
        currency: "",
        period: "",
      },
    });
  }
  const inversePeriod =
    menuPlan?.[0]?.paymentPlan?.period === "yearly" ? "Monthly" : "Yearly";
  return (
    <Stack my={"lg"}>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"}>
        {menuPlan?.map((data, index) => {
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
                display={index === 1 ? "block" : "none"}
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
                inversePeriod={inversePeriod}
                largeScreen={largeScreen}
                key={data.id}
                menuPage={true}
              />
            </Stack>
          );
        })}
      </Flex>
    </Stack>
  );
};
