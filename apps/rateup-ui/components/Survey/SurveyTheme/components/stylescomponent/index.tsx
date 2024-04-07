import {
  Box,
  Button,
  Group,
  MantineProvider,
  Portal,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { produce } from "immer";
import { useContext, useEffect, useState } from "react";
import {
  useSurveyTheme,
  useUpdateSurveyTheme,
} from "../../../../../backend/surveyTheme/surveyTheme.query";
import { theme } from "../../../../../config/mantineTheme";
import { SAVE_HOTKEY } from "../../../../../utils/constants";
import { SelectedItemEnum, ThemeTabEnum } from "../../SurveyTheme.enums";
import {
  compareTwoObjects,
  destructureThemeAndUploadImagesIfAny,
} from "../../SurveyTheme.utils";
import { SurveyThemeContext } from "../../SurveyThemeContext";
import {
  ThankyouTheme,
  WelcomeTheme,
  _SurveyTheme,
} from "../../surveyTheme.types";
import BackgroundStyles from "../BackgroundStyles";
import ButtonStyles from "../ButtonStyles";
import HeaderStyles from "../HeaderStyles";
import InputStyles from "../InputStyles";
import LogoStyles from "../LogoStyles";
import CustomSwitch from "./CustomSwitch";
import styles from "./StylesComponent.module.css";
import DescStyles from "../DescStyles";

type SelectedStyles = WelcomeTheme | _SurveyTheme | ThankyouTheme;
interface StylesComponentProps {
  selectedType: SelectedItemEnum;
  availableStyleComponents: Array<SelectedItemEnum>;
  setSelectedTab: any;
  selectedTab: ThemeTabEnum;
  survey: any;
}

function RenderOption({ option, checked }) {
  return <Box>{option.label}</Box>;
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
  const { data: _webSurveyTheme } = useSurveyTheme(survey?.webSurveyThemeId);
  const {
    id,
    welcomeTheme,
    surveyTheme: _surveyTheme,
    thankyouTheme,
  } = surveyTheme;
  const [selectedTabStyles, setSelectedTabStyles] = useState<SelectedStyles>();

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

  useEffect(() => {
    setSurveyTheme(_webSurveyTheme);
  }, [_webSurveyTheme]);

  const confettiEnabled = (selectedTabStyles as ThankyouTheme)?.confettiEnabled;

  const isOrgLogoEnabled =
    (selectedTabStyles as _SurveyTheme)?.orgLogoEnabled === false
      ? false
      : true;

  return (
    <>
      <MantineProvider theme={theme}>
        <Box
          className={styles["styles-component-div"]}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "0.875rem",
          }}
        >
          <Select
            className={styles["editor-select-dropdown"]}
            value={tabState}
            data={availableStyleComponents}
            onChange={(value: string) => setTabState(value as SelectedItemEnum)}
            leftSection={<IconEdit width={"1rem"} />}
            renderOption={RenderOption}
            classNames={{
              option: styles["editor-select-dropdown-option"],
              input: styles["editor-selector-dropdown-input"],
            }}
            allowDeselect={false}
          />

          <Tabs value={tabState}>
            <ScrollArea scrollbarSize={5} offsetScrollbars>
              {availableStyleComponents.includes(
                SelectedItemEnum.BACKGROUND,
              ) && (
                <Tabs.Panel value={SelectedItemEnum.BACKGROUND}>
                  <Stack w="100%">
                    {selectedTab === ThemeTabEnum.THANKYOU && (
                      <CustomSwitch
                        checked={confettiEnabled}
                        onChange={(e) =>
                          updateSelectedTabStyle(
                            "confettiEnabled",
                            e?.target?.checked,
                          )
                        }
                        label={"Confetti Enabled"}
                      />
                    )}
                    {selectedTab === ThemeTabEnum.SURVEY && (
                      <CustomSwitch
                        checked={isOrgLogoEnabled}
                        onChange={(e) =>
                          updateSelectedTabStyle(
                            "orgLogoEnabled",
                            e?.target?.checked,
                          )
                        }
                        label={"Organization Logo"}
                      />
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
                    selectedTab={selectedTab}
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
          </Tabs>
        </Box>
      </MantineProvider>
    </>
  );
}

export default StylesComponent;
