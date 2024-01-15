import React from "react";
import { Box, Card, Center, Flex, Stack, Text } from "@mantine/core";
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { CardWidth, Title1, Title2, Title3, Title4 } from "../Utils/constants";

export const SurveySection = ({ largeScreen, handlePlanSelection, plans }) => {
  const surveyPlan = plans?.filter(
    (item) => !item?.paymentPlan?.name?.includes("Menu"),
  );
  surveyPlan?.push({
    paymentPlan: {
      amount: "Lets Talk!",
      currency: "",
      period: "",
      name: "Enterprise",
    },
  });

  return (
    <Flex justify={"center"} gap={"xl"} wrap={"wrap"} my={"lg"}>
      {surveyPlan?.map((data, index) => {
        let mainColor;
        if (index == 0) mainColor = "var(--grey-color-4)";
        else if (index === 1) mainColor = "var(--orange-400)";
        else mainColor = "var(--shade-of-blue-2)";
        return (
          <Stack
            align="center"
            gap={0}
            pos={"relative"}
            key={data?.paymentPlan?.name}
          >
            <Box
              bg={mainColor}
              c={"white"}
              py={"8px"}
              px={"xl"}
              ta={"center"}
              style={{
                borderRadius: "15px",
              }}
              w={"fit-content"}
              display={index === 1 ? "block" : "none"}
            >
              Most Popular
            </Box>
            <Card
              shadow="sm"
              padding="lg"
              radius="lg"
              w={CardWidth}
              mt={index === 1 ? "-8px" : "xl"}
              mih={"clamp(390px, 318.576px + 11.905vw, 490px)"}
            >
              <Card.Section>
                <Box h={22} bg={mainColor} />
              </Card.Section>
              <Stack align="center" mt={"md"}>
                <Text fz={Title4} c={"var(--grey-color)"}>
                  {data?.paymentPlan?.name}
                </Text>
              </Stack>
              {index === 2 ? (
                <>
                  <Center
                    c={mainColor}
                    mb={largeScreen ? "xl" : "md"}
                    mt={largeScreen ? "lg" : "xs"}
                    pb={largeScreen && "5px"}
                  >
                    <Text fz={"clamp(30px, 25.712px + 0.714vw, 36px)"}>
                      Lets Talk!
                    </Text>
                  </Center>
                  <Center>
                    <RateupButtonPrimary
                      title="Contact Sales"
                      color={mainColor}
                      radius={"xl"}
                      sx={{
                        fontSize: Title4,
                        height: Title2,
                      }}
                    />
                  </Center>
                </>
              ) : (
                <>
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
                      title="Buy Rateup Plus"
                      color={mainColor}
                      radius={"xl"}
                      sx={{
                        fontSize: Title4,
                        height: Title2,
                      }}
                      onClick={() =>
                        handlePlanSelection({
                          id: "_ae71uwlj2" + index,
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
                    {index === 0 ? (
                      <>
                        <Text>2 Surveys</Text>
                        <Text>Unlimited Responses</Text>
                        <Text>Logic Jump</Text>
                        <Text>Google Review</Text>
                        <Text>Custom Filters</Text>
                        <Text>Location Fetching</Text>
                        <Text>Custom Welcome Page</Text>
                      </>
                    ) : (
                      <>
                        <Text>Unlimited Surveys</Text>
                        <Text>Unlimited Responses</Text>
                        <Text>Logic Jump</Text>
                        <Text>Google Review</Text>
                        <Text>Custom Filters</Text>
                        <Text>Location Fetching</Text>
                        <Text>Custom Welcome Page</Text>
                      </>
                    )}
                  </Stack>
                </>
              )}
            </Card>
          </Stack>
        );
      })}
    </Flex>
  );
};
