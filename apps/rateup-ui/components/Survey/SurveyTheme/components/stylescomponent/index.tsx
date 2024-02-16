import React, { useContext, useEffect, useState } from "react";
import BackgroundStyles from "../BackgroundStyles";
import HeaderStyles from "../HeaderStyles";
import DescStyles from "../DescStyles";
import ButtonStyles from "../ButtonStyles";
import {
  Tabs,
  Divider,
  Switch,
  Button,
  Text,
  Group,
  Badge,
  Paper,
  Stack,
  ScrollArea,
} from "@mantine/core";
import LogoStyles from "../LogoStyles";
import TabsCommon from "../../../../menu/landingPage/Tabs/TabsCommon";
import { SelectedItemEnum, ThemeTabEnum } from "../../SurveyTheme.enums";
import { SurveyThemeContext } from "../../SurveyThemeContext";
import {
  ThankyouTheme,
  WelcomeTheme,
  _SurveyTheme,
} from "../../surveyTheme.types";
import { produce } from "immer";
import PaperLayout from "../../../../styled/Layouts/PaperLayout";
import {
  useSurveyTheme,
  useUpdateSurveyTheme,
} from "../../../../../backend/surveyTheme/surveyTheme.query";
import {
  compareTwoObjects,
  destructureThemeAndUploadImagesIfAny,
  getDividerLabel,
} from "../../SurveyTheme.utils";
import InputStyles from "../InputStyles";
import { useHotkeys } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../../../../utils/constants";

type SelectedStyles = WelcomeTheme | _SurveyTheme | ThankyouTheme;
interface StylesComponentProps {
  selectedType: SelectedItemEnum;
  availableStyleComponents: Array<SelectedItemEnum>;
  setSelectedTab: any;
  selectedTab: ThemeTabEnum;
  survey: any;
}
function StylesComponent({
  selectedType,
  setSelectedTab,
  selectedTab,
  survey,
  availableStyleComponents,
}: StylesComponentProps) {
  const [tabState, setTabState] = useState<string>(SelectedItemEnum.BACKGROUND);
  const { surveyTheme, setSurveyTheme } = useContext(SurveyThemeContext);
  const { data: _savedSurveyTheme } = useSurveyTheme(survey?.id);
  const {
    id,
    welcomeTheme,
    surveyTheme: _surveyTheme,
    thankyouTheme,
  } = surveyTheme;
  const updateSurveyTheme = useUpdateSurveyTheme(survey?.id);
  const [selectedTabStyles, setSelectedTabStyles] = useState<SelectedStyles>();
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  useEffect(() => {
    switch (selectedTab) {
      case ThemeTabEnum.WELCOME:
        setSelectedTabStyles(welcomeTheme);
        break;
      case ThemeTabEnum.SURVEY:
        setSelectedTabStyles(_surveyTheme);
        break;
      case ThemeTabEnum.THANKYOU:
        setSelectedTabStyles(thankyouTheme);
        break;
      default:
        break;
    }
  }, [selectedTab, surveyTheme]);

  useEffect(() => {
    switch (selectedType) {
      case SelectedItemEnum.LOGO:
        setTabState(SelectedItemEnum.LOGO);
        break;
      case SelectedItemEnum.TITLE:
        setTabState(SelectedItemEnum.TITLE);
        break;
      case SelectedItemEnum.SUBTITLE:
        setTabState(SelectedItemEnum.SUBTITLE);
        break;
      case SelectedItemEnum.BUTTON:
        setTabState(SelectedItemEnum.BUTTON);
        break;
      case SelectedItemEnum.BACKGROUND:
        setTabState(SelectedItemEnum.BACKGROUND);
        break;
      case SelectedItemEnum.INPUT:
        setTabState(SelectedItemEnum.INPUT);
        break;
      default:
        setTabState(SelectedItemEnum.BACKGROUND);
        break;
    }
  }, [selectedType]);

  useEffect(() => {
    setTabState(SelectedItemEnum.BACKGROUND);
  }, [selectedTab]);

  function updateSelectedTabStyle(key: string, value: any) {
    switch (selectedTab) {
      case ThemeTabEnum.WELCOME:
        setSurveyTheme(
          produce((draft) => {
            draft.welcomeTheme[key] = value;
          }),
        );
        break;
      case ThemeTabEnum.SURVEY:
        setSurveyTheme(
          produce((draft) => {
            draft.surveyTheme[key] = value;
          }),
        );
        break;
      case ThemeTabEnum.THANKYOU:
        setSurveyTheme(
          produce((draft) => {
            draft.thankyouTheme[key] = value;
          }),
        );
        break;
      default:
        break;
    }
  }
  async function saveStyles() {
    setSaveLoading(true);
    const newSurveyTheme =
      await destructureThemeAndUploadImagesIfAny(surveyTheme);
    updateSurveyTheme.mutate({
      surveyThemeId: id,
      body: newSurveyTheme,
    });
    setTimeout(() => {
      setSaveLoading(false);
    }, 1000);
  }
  useHotkeys([[SAVE_HOTKEY, saveStyles]]);
  useEffect(() => {
    setSurveyTheme(_savedSurveyTheme);
  }, [_savedSurveyTheme]);
  return (
    <>
      <PaperLayout
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <TabsCommon
          styles={{
            root: {
              height: "100%",
              display: "flex",
              flexDirection: "column",
            },
            list: {
              fontSize: "10px",
              gap: 2,
              justifyContent: "space-around",
            },
            tabLabel: {
              fontSize: "13px",
              fontWeight: "100",
            },
            tab: {
              borderRadius: 5,
              padding: 5,
            },
            panel: {
              flex: 1,
              display: "flex",
            },
          }}
          tabHeading={availableStyleComponents}
          value={tabState}
          onChange={(value: string) => setTabState(value as SelectedItemEnum)}
        >
          <Divider
            label={
              <Badge variant="light">
                {getDividerLabel(tabState as SelectedItemEnum)} Settings
              </Badge>
            }
            labelPosition="left"
            mt="sm"
            mb="md"
          />
          <ScrollArea scrollbarSize={5} offsetScrollbars>
            {availableStyleComponents.includes(SelectedItemEnum.BACKGROUND) && (
              <Tabs.Panel value={SelectedItemEnum.BACKGROUND}>
                <Stack w="100%">
                  {selectedTab === ThemeTabEnum.THANKYOU && (
                    <>
                      <Divider label="Confetti" variant="dashed" w={"100%"} />
                      <Paper m={"auto"} w={"fit-content"}>
                        <Switch
                          h={"fit-content"}
                          fw={400}
                          size="sm"
                          label="Enable Confetti"
                          checked={
                            (selectedTabStyles as ThankyouTheme)
                              ?.confettiEnabled
                          }
                          color="var(--tertiary-color)"
                          onChange={() =>
                            updateSelectedTabStyle(
                              "confettiEnabled",
                              !(selectedTabStyles as ThankyouTheme)
                                ?.confettiEnabled,
                            )
                          }
                        />
                      </Paper>
                    </>
                  )}
                  <BackgroundStyles
                    currentStyles={selectedTabStyles?.bg}
                    setCurrentstyles={updateSelectedTabStyle}
                  />
                </Stack>
              </Tabs.Panel>
            )}

            {availableStyleComponents.includes(SelectedItemEnum.LOGO) && (
              <Tabs.Panel value={SelectedItemEnum.LOGO}>
                <LogoStyles
                  currentStyles={
                    (selectedTabStyles as ThankyouTheme | WelcomeTheme)?.logo
                  }
                  setCurrentstyles={updateSelectedTabStyle}
                />
              </Tabs.Panel>
            )}

            {availableStyleComponents.includes(SelectedItemEnum.TITLE) && (
              <Tabs.Panel value={SelectedItemEnum.TITLE}>
                <HeaderStyles
                  currentStyles={
                    (selectedTabStyles as ThankyouTheme | WelcomeTheme)?.title
                  }
                  setCurrentstyles={updateSelectedTabStyle}
                />
              </Tabs.Panel>
            )}

            {availableStyleComponents.includes(SelectedItemEnum.SUBTITLE) && (
              <Tabs.Panel value={SelectedItemEnum.SUBTITLE}>
                <DescStyles
                  currentStyles={
                    (selectedTabStyles as ThankyouTheme | WelcomeTheme)
                      ?.subtitle
                  }
                  setCurrentstyles={updateSelectedTabStyle}
                />
              </Tabs.Panel>
            )}

            {availableStyleComponents.includes(SelectedItemEnum.BUTTON) && (
              <Tabs.Panel value={SelectedItemEnum.BUTTON}>
                <ButtonStyles
                  currentStyles={
                    (selectedTabStyles as _SurveyTheme | WelcomeTheme)?.button
                  }
                  setCurrentstyles={updateSelectedTabStyle}
                />
              </Tabs.Panel>
            )}
            {availableStyleComponents.includes(SelectedItemEnum.INPUT) && (
              <Tabs.Panel value={SelectedItemEnum.INPUT}>
                <InputStyles
                  currentStyles={(selectedTabStyles as _SurveyTheme)?.input}
                  setCurrentstyles={updateSelectedTabStyle}
                />
              </Tabs.Panel>
            )}
          </ScrollArea>
        </TabsCommon>
      </PaperLayout>
      <PaperLayout
        style={{ overflow: "hidden" }}
        mah={70}
        mih={70}
        p={"sm"}
        mt={"auto"}
        styles={{
          root: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        }}
      >
        <Group justify="space-between" w="100%">
          <Text
            c={
              compareTwoObjects(_savedSurveyTheme, surveyTheme)
                ? "green"
                : "red"
            }
            size="xs"
            fw={900}
          >
            <sup>*</sup>
            {!compareTwoObjects(_savedSurveyTheme, surveyTheme)
              ? "unsaved changes"
              : "All changes saved"}
          </Text>
          <Button
            loading={saveLoading}
            radius={48}
            size={"sm"}
            pl={40}
            pr={40}
            onClick={saveStyles}
            bg={"var(--tertiary-color)"}
          >
            Save
          </Button>
        </Group>
      </PaperLayout>
    </>
  );
}

export default StylesComponent;
