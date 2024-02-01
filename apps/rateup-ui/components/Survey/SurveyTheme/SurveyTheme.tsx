import React, { useState } from "react";
import styles from "./SurveyTheme.module.css";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage";
import StylesComponent from "./components/stylescomponent";
import SurveyThemeView from "./components/previewcomponents/surveytheme";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";
import SurveyThemeContextProvider from "./SurveyThemeContext";
import { Stack, Flex, Switch, Group, Tabs } from "@mantine/core";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { useSurveyTheme } from "../../../backend/surveyTheme/surveyTheme.query";
import { SelectedItemEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import { useDisclosure } from "@mantine/hooks";

function SurveyTheme({ survey }) {
  const [activeThemeTab, setActiveThemeTab] = useState<ThemeTabEnum>(
    ThemeTabEnum.WELCOME,
  );
  const [selectedType, setSelectedType] = useState<SelectedItemEnum>(
    SelectedItemEnum.BACKGROUND,
  );
  const { data: surveyTheme, isLoading } = useSurveyTheme(survey?.id);
  const editSurvey = useEditSurveyMutation(survey?.id);
  const [opened, { open, close }] = useDisclosure(false);
  function availableThemeStyleComponents(): Array<SelectedItemEnum> {
    const common = [
      SelectedItemEnum.BACKGROUND,
      SelectedItemEnum.TITLE,
      SelectedItemEnum.SUBTITLE,
    ];
    switch (activeThemeTab) {
      case ThemeTabEnum.WELCOME:
        return [...common, SelectedItemEnum.LOGO, SelectedItemEnum.BUTTON];
      case ThemeTabEnum.SURVEY:
        return [...common, SelectedItemEnum.BUTTON, SelectedItemEnum.INPUT];
      case ThemeTabEnum.THANKYOU:
        return [...common, SelectedItemEnum.LOGO];
      default:
        return [];
    }
  }
  const handleSwitchChange = (e) => {
    editSurvey.mutate({ welcomePageEnabled: e.currentTarget.checked });
  };
  if (isLoading) return <div>Loading...</div>;
  return (
    <SurveyThemeContextProvider surveyTheme={surveyTheme}>
      <StyledTabs
        value={activeThemeTab}
        onChange={(value) => setActiveThemeTab(value as ThemeTabEnum)}
        styles={{ root: { flex: 1 } }}
      >
        <Tabs.List ml={"auto"} mr={"auto"}>
          <Tabs.Tab value={ThemeTabEnum.WELCOME}>Welcome Page</Tabs.Tab>
          <Tabs.Tab value={ThemeTabEnum.SURVEY}>Survey Theme</Tabs.Tab>
          <Tabs.Tab value={ThemeTabEnum.THANKYOU}>Thankyou Page</Tabs.Tab>
        </Tabs.List>
        <Flex justify={"space-between"}>
          <SurveyThemePreviewLayout
            isLoading={isLoading}
            survey={survey}
            themeType={activeThemeTab}
          >
            <Tabs.Panel value={ThemeTabEnum.WELCOME} h="100%">
              <WelcomePageThemeView {...{ selectedType, setSelectedType }} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.SURVEY} h={"100%"}>
              <SurveyThemeView {...{ selectedType, setSelectedType }} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.THANKYOU} h={"100%"}>
              <ThankyouPageThemeView {...{ selectedType, setSelectedType }} />
            </Tabs.Panel>
          </SurveyThemePreviewLayout>
          <Stack style={{ flex: 0.3 }} miw={300} ml="xs">
            {activeThemeTab === ThemeTabEnum.WELCOME && (
              <PaperLayout
                className={styles["enable-welcome-page-switch-container"]}
              >
                <Group justify="center">
                  <Switch
                    fw={400}
                    size="lg"
                    label="Enable Welcome page"
                    checked={survey?.welcomePageEnabled}
                    color="var(--tertiary-color)"
                    onChange={handleSwitchChange}
                  />
                </Group>
              </PaperLayout>
            )}
            <StylesComponent
              selectedType={
                selectedType ? selectedType : SelectedItemEnum.BACKGROUND
              }
              availableStyleComponents={availableThemeStyleComponents()}
              setSelectedTab={setActiveThemeTab}
              selectedTab={activeThemeTab}
              survey={survey}
            />
          </Stack>
        </Flex>
      </StyledTabs>
    </SurveyThemeContextProvider>
  );
}

export default SurveyTheme;
