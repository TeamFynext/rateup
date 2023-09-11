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
import StyledTabs from "../surveys/StyledTabs";

enum TabEnum {
  Surveys = "Surveys",
  Share = "Share",
  WelcomePage = "Welcome Page",
}
export default () => {
  const router = useRouter();
  const { LandingId } = router.query;
  const { tab } = router.query;

  if (Array.isArray(LandingId)) {
    throw new Error("surveyId is an array");
  }

  useEffect(() => {
    if (tab && Object.values(TabEnum).includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  const [activeTab, setActiveTab] = useState<TabEnum | null>(TabEnum.Surveys);

  const {
    isLoading: isLandingPageLoading,
    error: LandingPageError,
    data: LandingPageData,
  } = useLandingPage(LandingId);


  if (Array.isArray(LandingId)) {
    throw new Error("surveyId is an array");
  }
  

  return (
    <Flex direction={"column"}>
      <Stack>
        <StyledTabs
          value={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabEnum)}
        >
          <Group position="apart">
            <Tabs.List
              sx={{
                position: "absolute",
                width: "fit-content",
                left: 0,
                right: 0,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <Tabs.Tab value={TabEnum.Surveys}>Surveys</Tabs.Tab>
              <Tabs.Tab value={TabEnum.WelcomePage}>Welcome Page</Tabs.Tab>

              <Tabs.Tab value={TabEnum.Share}>Share</Tabs.Tab>
            </Tabs.List>


            <Tabs.Panel value={TabEnum.WelcomePage}>
              <div></div>
            </Tabs.Panel>
            <Tabs.Panel value={TabEnum.Share}>
              <div></div>
            </Tabs.Panel>
          </Group>

          <Space h="xl" />

          <Tabs.Panel value={TabEnum.Surveys}>
            {/** TODO: Remove fixed height and make this responsive */}
            <LandingSurveysList />
          </Tabs.Panel>

          <Tabs.Panel value={TabEnum.WelcomePage}>
          <LandingWelcomeTheme LandingPageData={LandingPageData} LandingId={LandingId ? LandingId : null} />
          </Tabs.Panel>

          <Tabs.Panel value={TabEnum.Share}>
          <ShareLandingPage  LandingId={LandingId ? LandingId : null} />
          </Tabs.Panel>
        </StyledTabs>
      </Stack>
    </Flex>
  );
};
