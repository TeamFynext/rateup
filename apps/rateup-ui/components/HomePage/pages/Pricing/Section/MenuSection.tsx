import React, { useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  Box,
  Center,
  Checkbox,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import PaperLayout from "../../../../styled/Layouts/PaperLayout";
import { Title1, Title2, Title3, Title4 } from "../Utils/constants";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";

export const MenuSection = ({ largeScreen, price, BlueGradient }) => {
  const [addonEnabled, setAddonEnabled] = useState(false);
  return (
    <Stack my={"lg"}>
      <PaperLayout
        style={{
          border: "none",
        }}
        mt={"lg"}
      >
        <Box h={22} bg={"var(--shade-of-blue-5)"} m={"-15px"} />
        <SimpleGrid
          cols={{ base: 1, xl: 2 }}
          mt={"md"}
          px={largeScreen ? "xl" : 0}
          py={"md"}
        >
          <Stack gap={0}>
            <Text fz={Title4}>Rate Up Digital Menu</Text>
            <Group
              my={largeScreen ? "sm" : "xs"}
              align={"baseline"}
              gap={0}
              miw={220}
            >
              <Text fz={Title1} variant="gradient" gradient={BlueGradient}>
                <sup
                  style={{
                    fontSize: Title3,
                  }}
                >
                  {price?.currency}
                </sup>
                <NumberAnimate value={price?.menu} />
              </Text>
              <Text variant="gradient" gradient={BlueGradient}>
                /month
              </Text>
            </Group>
            <Stack ff={lexend300.style.fontFamily} gap={5}>
              <Text>2 Surveys</Text>
              <Text>Unlimited Responses</Text>
              <Text>Logic Jump</Text>
              <Text>Google Review</Text>
              <Text>Custom Filters</Text>
              <Text>Location Fetching</Text>
              <Text>Custom Welcome Page</Text>
            </Stack>
            <PaperLayout radius={"sm"} mt={"md"}>
              <Stack gap={0}>
                <Group justify={"space-between"}>
                  <Text>ADD ONS:</Text>
                  <Checkbox
                    checked={addonEnabled}
                    onChange={(event) =>
                      setAddonEnabled(event.currentTarget.checked)
                    }
                  />
                </Group>
                <Group>
                  <Text>Survey Feedbacks</Text>
                  <Group align={"baseline"} gap={0} miw={190}>
                    <Text
                      fz={"clamp(26px, 16px + 1.667vw, 40px)"}
                      variant="gradient"
                      gradient={BlueGradient}
                    >
                      <sup
                        style={{
                          fontSize: Title4,
                        }}
                      >
                        {price?.currency}
                      </sup>
                      <NumberAnimate value={price?.surveyAddon} />
                    </Text>
                    <Text variant="gradient" gradient={BlueGradient}>
                      /month
                    </Text>
                  </Group>
                </Group>
                <Group
                  gap={"4px"}
                  align="start"
                  c={"var(--light-grey-color-5)"}
                  ff={lexend300.style.fontFamily}
                >
                  <IconInfoCircle />
                  <Text maw={283}>
                    This will take a survey of users to get feedback on their
                    menu and customer experiences
                  </Text>
                </Group>
              </Stack>
            </PaperLayout>
          </Stack>
          <Stack justify="center" align="center" gap={0}>
            <Box>
              <Text fz={Title4}>Total Amount:</Text>
              <Text c={"var(--grey-color)"} ff={lexend300.style.fontFamily}>
                including Add Ons
              </Text>
              <Text c={"var(--grey-color)"} ff={lexend300.style.fontFamily}>
                (Survey Feedback)
              </Text>
              <Group my={largeScreen ? "lg" : "xs"} align={"baseline"} gap={0}>
                <Text fz={Title1} variant="gradient" gradient={BlueGradient}>
                  <sup
                    style={{
                      fontSize: Title3,
                    }}
                  >
                    {price?.currency}
                  </sup>
                  <NumberAnimate
                    value={
                      addonEnabled ? price.menu + price.surveyAddon : price.menu
                    }
                  />
                </Text>
                <Text variant="gradient" gradient={BlueGradient}>
                  /month
                </Text>
              </Group>
              <Center>
                <RateupButtonPrimary
                  title="Buy Digital Menu"
                  color="var(--shade-of-blue-2)"
                  radius={"xl"}
                  variant="gradient"
                  gradient={BlueGradient}
                  sx={{
                    fontSize: Title4,
                    height: Title2,
                  }}
                />
              </Center>
            </Box>
          </Stack>
        </SimpleGrid>
      </PaperLayout>
    </Stack>
  );
};
