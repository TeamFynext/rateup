import React from "react";
import {
  Box,
  Group,
  Loader,
  Select,
  Stack,
  Tabs,
  Title,
  Space,
  Badge,
  Flex,
  TabsProps,
  rem,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";
import LandingWelcomeTheme from "../../../components/LandingPage/LandingWelcomeTheme/LandingWelcomeTheme";
import LandingSurveysList from "./LandingSurveysList";
import { useRouter } from "next/router";
import ShareLandingPage from "../../../components/LandingPage/ShareLandingPage/ShareLandinPage";
import { useLandingPage } from "../../../backend/surveys/surveys.query";
export default () => {
  const router = useRouter();
  const { LandingId } = router.query;


  if (Array.isArray(LandingId)) {
    throw new Error("surveyId is an array");
  }
  const {
    isLoading: isLandingPageLoading,
    error: LandingPageError,
    data: LandingPageData,
  } = useLandingPage(LandingId);

  return (
    <Flex direction={"column"}>
      <StyledTabs variant="pills" defaultValue="surveys">
        <Flex justify={"center"}>
          <Tabs.List grow>
            <Tabs.Tab value="surveys">
              <Text
                sx={(theme) => ({
                  fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                  fontWeight: 500,
                  fontSize: 18,
                })}
              >
                Surveys
              </Text>
            </Tabs.Tab>
            <Tabs.Tab value="welcome">
              <Text
                sx={(theme) => ({
                  fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                  fontWeight: 500,
                  fontSize: 18,
                })}
              >
                Welcome Page
              </Text>
            </Tabs.Tab>
            <Tabs.Tab value="share">
              <Text
                sx={(theme) => ({
                  fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                  fontWeight: 500,
                  fontSize: 18,
                })}
              >
                Share
              </Text>
            </Tabs.Tab>
          </Tabs.List>
        </Flex>

        <Tabs.Panel value="surveys" pt="md">
          <LandingSurveysList />
        </Tabs.Panel>
        <Tabs.Panel value="welcome" pt="md">
          <LandingWelcomeTheme LandingPageData={LandingPageData} LandingId={LandingId ? LandingId : null} />
        </Tabs.Panel>
        {/* //-----------------share  ------------- */}
        <Tabs.Panel value="share" pt="md">
          {/* <LandingWelcomeTheme LandingId={LandingId ? LandingId : null} /> */}
          <ShareLandingPage  LandingId={LandingId ? LandingId : null} />
        </Tabs.Panel>
      </StyledTabs>
    </Flex>
  );
};

function StyledTabs(props: TabsProps) {
  return (
    <Tabs
      unstyled
      styles={(theme) => ({
        tab: {
          ...theme.fn.focusStyles(),
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
          color:
            theme.colorScheme === "dark"
              ? theme.colors.dark[0]
              : theme.colors.gray[9],
          border: `${rem(1)} solid ${
            theme.colorScheme === "dark"
              ? theme.colors.dark[6]
              : theme.colors.gray[4]
          }`,
          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
          cursor: "pointer",
          fontSize: theme.fontSizes.sm,
          display: "flex",
          alignItems: "center",

          "&:disabled": {
            opacity: 0.5,
            cursor: "not-allowed",
          },

          "&:not(:first-of-type)": {
            borderLeft: 0,
          },

          "&:first-of-type": {
            borderTopLeftRadius: theme.radius.md,
            borderBottomLeftRadius: theme.radius.md,
          },

          "&:last-of-type": {
            borderTopRightRadius: theme.radius.md,
            borderBottomRightRadius: theme.radius.md,
          },

          "&[data-active]": {
            backgroundColor: "#3F5BA9 ",
            borderColor: theme.colors.blue[7],
            color: theme.white,
            // borderRadius:8
          },
        },

        tabIcon: {
          marginRight: theme.spacing.xs,
          display: "flex",
          alignItems: "center",
        },

        tabsList: {
          display: "flex",
        },
      })}
      {...props}
    />
  );
}
