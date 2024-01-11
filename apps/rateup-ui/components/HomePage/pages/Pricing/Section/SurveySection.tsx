import React from "react";
import { Box, Card, Center, Flex, Stack, Text } from "@mantine/core";
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { CardWidth, Title1, Title2, Title3, Title4 } from "../Utils/constants";

export const SurveySection = ({
  largeScreen,
  price,
  checked,
  handlePlanSelection,
}) => {
  const durationType = checked ? "year" : "month";

  return (
    <Flex justify={"center"} gap={"xl"} wrap={"wrap"} my={"lg"}>
      <Card shadow="sm" padding="lg" radius="lg" w={CardWidth} mt={"xl"}>
        <Card.Section>
          <Box h={22} bg={"var(--grey-color-4)"} />
        </Card.Section>
        <Stack align="center" mt={"md"}>
          <Text fz={Title4} c={"var(--grey-color)"}>
            Rate Up Essentials
          </Text>
        </Stack>
        <Center c={"var(--grey-color-4)"} my={largeScreen ? "lg" : "xs"}>
          <Text fz={Title1}>
            <sup
              style={{
                fontSize: Title3,
              }}
            >
              {price?.currency}
            </sup>
            <NumberAnimate value={price?.essentials} />
          </Text>
          <Text>/{durationType}</Text>
        </Center>
        <Center>
          <RateupButtonPrimary
            title="Buy Rateup Essentials"
            color="var(--grey-color-4)"
            radius={"xl"}
            sx={{
              fontSize: Title4,
              height: Title2,
            }}
            onClick={() =>
              handlePlanSelection({ id: "_ae71uwlj3", name: "essentials" })
            }
          />
        </Center>
        <Stack align="center" ff={lexend300.style.fontFamily} gap={5} mt={"xl"}>
          <Text>2 Surveys</Text>
          <Text>Unlimited Responses</Text>
          <Text>Logic Jump</Text>
          <Text>Google Review</Text>
          <Text>Custom Filters</Text>
          <Text>Location Fetching</Text>
          <Text>Custom Welcome Page</Text>
        </Stack>
      </Card>
      <Stack align="center" gap={0} pos={"relative"}>
        <Box
          bg={"var(--orange-400)"}
          c={"white"}
          py={"8px"}
          px={"xl"}
          ta={"center"}
          style={{
            borderRadius: "15px",
          }}
          w={"fit-content"}
        >
          Most Popular
        </Box>
        <Card shadow="sm" padding="lg" radius="lg" w={CardWidth} mt={"-8px"}>
          <Card.Section>
            <Box h={22} bg={"var(--orange-400)"} />
          </Card.Section>
          <Stack align="center" mt={"md"}>
            <Text fz={Title4} c={"var(--grey-color)"}>
              Rate Up Plus
            </Text>
          </Stack>
          <Center c={"var(--orange-400)"} my={largeScreen ? "lg" : "xs"}>
            <Text fz={Title1}>
              <sup
                style={{
                  fontSize: Title3,
                }}
              >
                {price?.currency}
              </sup>
              <NumberAnimate value={price?.plus} />
            </Text>
            <Text>/{durationType}</Text>
          </Center>
          <Center>
            <RateupButtonPrimary
              title="Buy Rateup Plus"
              color="var(--orange-400)"
              radius={"xl"}
              sx={{
                fontSize: Title4,
                height: Title2,
              }}
              onClick={() =>
                handlePlanSelection({ id: "_ae71uwlj3", name: "plus" })
              }
            />
          </Center>
          <Stack
            align="center"
            ff={lexend300.style.fontFamily}
            gap={5}
            mt={"xl"}
          >
            <Text>Unlimited Surveys</Text>
            <Text>Unlimited Responses</Text>
            <Text>Logic Jump</Text>
            <Text>Google Review</Text>
            <Text>Custom Filters</Text>
            <Text>Location Fetching</Text>
            <Text>Custom Welcome Page</Text>
          </Stack>
        </Card>
      </Stack>
      <Card
        shadow="sm"
        padding="lg"
        radius="lg"
        w={CardWidth}
        mt={"xl"}
        mih={"450px"}
      >
        <Card.Section>
          <Box h={22} bg={"var(--shade-of-blue-2)"}></Box>
        </Card.Section>
        <Stack align="center" mt={"md"}>
          <Text fz={Title4} c={"var(--grey-color)"}>
            Enterprise
          </Text>
        </Stack>
        <Center
          c={"var(--shade-of-blue-2)"}
          mb={largeScreen ? "xl" : "md"}
          mt={largeScreen ? "lg" : "xs"}
          pb={largeScreen && "5px"}
        >
          <Text fz={"clamp(30px, 25.712px + 0.714vw, 36px)"}>Lets Talk!</Text>
        </Center>
        <Center>
          <RateupButtonPrimary
            title="Contact Sales"
            color="var(--shade-of-blue-2)"
            radius={"xl"}
            sx={{
              fontSize: Title4,
              height: Title2,
            }}
          />
        </Center>
      </Card>
    </Flex>
  );
};
