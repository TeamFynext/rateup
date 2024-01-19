import React from "react";
import { Box, Card, Center, Flex, List, Stack, Text, rem } from "@mantine/core";
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { CardWidth, Title1, Title2, Title3, Title4 } from "../Utils/constants";
import { IconCircleCheck } from "@tabler/icons-react";

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
  const generateListItems = (title: string) => (
    <List
      spacing="xs"
      size="md"
      center
      icon={
        <IconCircleCheck
          style={{ width: rem(16), height: rem(16), color: "green" }}
        />
      }
    >
      <List.Item>{title}</List.Item>
      <List.Item>Unlimited Responses</List.Item>
      <List.Item>Logic Jump</List.Item>
      <List.Item>Google Review</List.Item>
      <List.Item>Custom Filters</List.Item>
      <List.Item>Location Fetching</List.Item>
      <List.Item>Custom Welcome Page</List.Item>
    </List>
  );
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
                    {index === 0
                      ? generateListItems("2 Surveys")
                      : generateListItems("Unlimited Surveys")}
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
