import React from "react";
import { Box, Card, Center, Flex, Stack, Text } from "@mantine/core";
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import { CardWidth, Title1, Title2, Title3, Title4 } from "../Utils/constants";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";

export const MenuSection = ({ largeScreen, handlePlanSelection, plans }) => {
  const menuPlan = plans?.filter(
    (item) => item?.paymentPlan?.name?.includes("Menu"),
  );
  return (
    <Stack my={"lg"}>
      <Flex justify={"center"} gap={"xl"} wrap={"wrap"} my={"lg"}>
        {menuPlan?.map((data, index) => {
          const mainColor =
            index === 0 ? "var(--grey-color-4)" : "var(--shade-of-blue-5)";
          return (
            <Card
              shadow="sm"
              padding="lg"
              radius="lg"
              w={CardWidth}
              mt={"xl"}
              key={data?.paymentPlan?.name}
              mih={"clamp(390px, 318.576px + 11.905vw, 490px)"}
            >
              <Card.Section>
                <Box h={22} bg={mainColor} />
              </Card.Section>
              <Stack align="center" mt={"md"}>
                <Text fz={Title4} c={"var(--grey-color)"} tt={"capitalize"}>
                  {data?.paymentPlan?.name}
                </Text>
              </Stack>
              <Center c={mainColor} my={largeScreen ? "lg" : "xs"}>
                <Text fz={Title1}>
                  <sup
                    style={{
                      fontSize: Title3,
                    }}
                  >
                    {data?.paymentPlan?.currency}
                  </sup>
                  <NumberAnimate value={data?.paymentPlan?.amount} />
                </Text>
                <Text>/{data?.paymentPlan?.period}</Text>
              </Center>
              <Center>
                <RateupButtonPrimary
                  title={
                    index === 0 ? `Buy Rateup Menu` : "Buy Rateup Menu pro"
                  }
                  color={mainColor}
                  radius={"xl"}
                  sx={{
                    fontSize: Title4,
                    height: Title2,
                  }}
                  onClick={() =>
                    handlePlanSelection({
                      id: "_ae71uwlj3" + index,
                      name: data?.paymentPlan?.name,
                    })
                  }
                />
              </Center>
              <Stack
                align="center"
                ff={lexend300.style.fontFamily}
                gap={5}
                mt={"xl"}
              >
                <Text>Create Menu</Text>
                <Text>Unlimited Categories</Text>
                <Text>Special Banners</Text>
                <Text>Custom Welcome Page</Text>
                {index == 1 && <Text>Survey Feedbacks</Text>}
              </Stack>
            </Card>
          );
        })}
      </Flex>
    </Stack>
  );
};
