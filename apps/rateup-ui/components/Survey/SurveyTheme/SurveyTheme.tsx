import React, { useState } from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage";
import StylesComponent from "./components/stylescomponent";
import SurveyThemeView from "./components/previewcomponents/surveytheme";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";
import SurveyThemeContextProvider from "./SurveyThemeContext";
import { Stack, Flex, Switch, Group, Tabs, Box } from "@mantine/core";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { useSurveyTheme } from "../../../backend/surveyTheme/surveyTheme.query";
import { SelectedItemEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import styles from "./SurveyTheme.module.css";

function SurveyTheme({ survey }) {
  const [activeThemeTab, setActiveThemeTab] = useState<ThemeTabEnum>(
    ThemeTabEnum.WELCOME,
  );
  const [selectedType, setSelectedType] = useState<SelectedItemEnum>(
    SelectedItemEnum.BACKGROUND,
  );
  const { data: surveyTheme, isLoading } = useSurveyTheme(survey?.id);
  const editSurvey = useEditSurveyMutation(survey?.id);
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
        className={styles["theme-page-div"]}
        value={activeThemeTab}
        onChange={(value) => setActiveThemeTab(value as ThemeTabEnum)}
      >
        <Tabs.List ml={"auto"} mr={"auto"}>
          <Tabs.Tab value={ThemeTabEnum.WELCOME}>Welcome Page</Tabs.Tab>
          <Tabs.Tab value={ThemeTabEnum.SURVEY}>Survey Theme</Tabs.Tab>
          <Tabs.Tab value={ThemeTabEnum.THANKYOU}>Thankyou Page</Tabs.Tab>
        </Tabs.List>

        <Flex h={"100%"}>
          <SurveyThemePreviewLayout
            isLoading={isLoading}
            survey={survey}
            themeType={activeThemeTab}
          >
            <Tabs.Panel value={ThemeTabEnum.WELCOME}>
              <WelcomePageThemeView {...{ selectedType, setSelectedType }} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.SURVEY}>
              <SurveyThemeView {...{ selectedType, setSelectedType }} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.THANKYOU}>
              <ThankyouPageThemeView {...{ selectedType, setSelectedType }} />
            </Tabs.Panel>
          </SurveyThemePreviewLayout>

          <Stack style={{ flex: 0.27 }} miw={300} p={"0.4375rem"} h={"75vh"}>
            {activeThemeTab === ThemeTabEnum.WELCOME && (
              <PaperLayout h={60}>
                <Group justify="center" h="100%" w="100%">
                  <Switch
                    fw={400}
                    size="sm"
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
