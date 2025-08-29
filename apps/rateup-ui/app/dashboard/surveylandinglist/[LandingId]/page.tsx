"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Flex, Group, Space, Stack, Tabs } from "@mantine/core";

// import ShareLandingPage from "../../../components/LandingPage/ShareLandingPage/ShareLandinPage";
import { useLandingPage } from "../../../../backend/surveys/surveys.query";
import StyledTabs from "../../../../components/styled/StyledTabs/StyledTabs";
// import LandingWelcomeTheme from "../../../components/LandingPage/LandingWelcomeTheme/LandingWelcomeTheme";
import LandingSurveysList from "../LandingSurveysList";

enum TabEnum {
  Surveys = "Surveys",
  Share = "Share",
  WelcomePage = "Welcome Page",
}
export const LandingById = () => {
  const params = useParams();

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const LandingId = params.LandingId as string;

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
          onChange={(tab) => setActiveTab(tab as TabEnum)}
        >
          <Group justify="space-between">
            <Tabs.List
              style={{
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

          {/* <Tabs.Panel value={TabEnum.WelcomePage}>
            <LandingWelcomeTheme
              LandingPageData={LandingPageData}
              LandingId={LandingId ? LandingId : null}
            />
          </Tabs.Panel> */}

          {/* <Tabs.Panel value={TabEnum.Share}>
            <ShareLandingPage LandingId={LandingId ? LandingId : null} />
          </Tabs.Panel> */}
        </StyledTabs>
      </Stack>
    </Flex>
  );
};

export default LandingById;
