import React from "react";
import { Flex, Stack } from "@mantine/core";
import PricingCard from "../Card/PricingCard";
import PlanCard from "../Card/PlanCard";

export const MenuSection = ({
  largeScreen,
  handlePlanSelection,
  plans,
  currencySymbol,
}) => {
  const menuPlan = plans
    ?.filter((item) => item?.name?.includes("Menu"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  const inversePeriod =
    menuPlan?.[0]?.paymentPlan?.period === "yearly" ? "Monthly" : "Yearly";
  return (
    <Stack my={"lg"}>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"}>
        {menuPlan?.map((data, index) => {
          return (
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
          );
        })}
      </Flex>
    </Stack>
  );
};
