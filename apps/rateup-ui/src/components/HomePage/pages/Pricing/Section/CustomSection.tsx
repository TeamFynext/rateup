import { Box, Flex, Stack, Text } from "@mantine/core";

import PlanCard from "../Card/PlanCard.tsx";
import { PlanCardWidth } from "../Utils/constants.ts";

export const CustomSection = ({ largeScreen, handlePlanSelection, plans, currencySymbol }) => {
  const customPlan = plans
    ?.filter((item) => item?.name?.includes("Custom"))
    ?.sort((a, b) => a?.paymentPlan?.amount - b?.paymentPlan?.amount);

  if (customPlan?.length >= 0) {
    customPlan?.push({
      displayName: "Business",
      paymentPlan: {
        amount: "Lets Talk!",
        currency: "",
        period: "",
      },
    });
  }

  const customPlans = [...customPlan];

  return (
    <Stack my={"lg"}>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"}>
        {customPlans?.map((data, index) => {
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
                display={index === 5 ? "block" : "none"}
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
                totalItems={customPlans.length}
                largeScreen={largeScreen}
                key={data.id}
              />
            </Stack>
          );
        })}
      </Flex>
    </Stack>
  );
};
