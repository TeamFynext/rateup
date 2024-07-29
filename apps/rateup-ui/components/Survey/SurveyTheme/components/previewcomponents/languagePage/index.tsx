import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Box,
  Flex,
  Image,
  MantineProvider,
  MantineThemeProvider,
  Radio,
  ScrollAreaAutosize,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconChevronRight, IconEdit } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { lexend } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils";
import { SingleSelectCard } from "../../../../TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard";
import { SelectedItemEnum } from "../../../SurveyTheme.enums";
import surveyThemeStyles from "../../../SurveyTheme.module.css";
import {
  useSelectedPreview,
  useSetSelectedEditor,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext";
import styles from "./languagePage.module.css";

const cx = classNames.bind(styles);
const surveyThemeStylesCx = classNames.bind(surveyThemeStyles);

function LanguagePage({ survey, isThemeObjBeingEditedDefaultTheme }) {
  const selectedPreview = useSelectedPreview();
  const setSelectedEditor = useSetSelectedEditor();

  const subtitleInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const startBtnInputRef = useRef(null);

  const surveyThemeObj = useSurveyThemeContextValue();
  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const languages = survey.languages;
  const [lang, setLang] = useState(languages[0]);

  const {
    surveyTheme: {
      logo: { logo: logoUrl, styles: logoStyles },
    },
    languageTheme: {
      bg: { useSurveyBackground = false },
      title: { styles: titleStyles, title },
      subtitle: { styles: subtitleStyles, subtitle },
      button: { styles: buttonStyles, label: startBtnLabel },
      input: { primaryColor: inputPrimaryColor },
    },
  } = surveyThemeObj;

  const isOrgLogoPresent = logoUrl?.length > 0;
  const isMobile = selectedPreview === "mobile";
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeObj,
    useSurveyBackground ? "surveyTheme" : "languageTheme",
    isMobile,
  );

  const handleSubtitleInputChange = useCallback(
    (e) => {
      if (!isThemeObjBeingEditedDefaultTheme)
        surveyThemeDispatch({
          type: "subtitle-text-change",
          payload: e.target.value,
        });
    },
    [isThemeObjBeingEditedDefaultTheme],
  );

  const handleTitleInputChange = useCallback(
    (e) => {
      if (!isThemeObjBeingEditedDefaultTheme)
        surveyThemeDispatch({
          type: "title-text-change",
          payload: e.target.value,
        });
    },
    [isThemeObjBeingEditedDefaultTheme],
  );

  const handleStartBtnTextChange = useCallback(
    (e) => {
      if (!isThemeObjBeingEditedDefaultTheme)
        surveyThemeDispatch({
          type: "wp-lp-start-button-text-change",
          payload: e.target.value,
        });
    },
    [isThemeObjBeingEditedDefaultTheme],
  );

  useEffect(() => {
    startBtnInputRef.current.setAttribute("size", startBtnLabel.length - 1);
  }, [startBtnLabel]);

  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  return (
    <CreditsCard enableCredits={isUnsplashImage} url={backgroundImageSrc}>
      <Flex
        className={cx("preview-language-page-container", {
          "org-logo-not-present": !isOrgLogoPresent,
        })}
        style={{
          backgroundColor,
          backgroundImage: `url(${backgroundImageSrc})`,
        }}
      >
        {isOrgLogoPresent && (
          <Flex className={cx("logo-container")}>
            <Image
              className={cx("logo")}
              src={logoUrl}
              style={logoStyles}
              fit="contain"
            />
          </Flex>
        )}

        <Stack className={cx("header-radio-grp-start-btn-container")}>
          <Stack className={cx("header")}>
            <Tooltip label="Edit Subtitle">
              <Stack className={surveyThemeStylesCx("titleBox")}>
                <TextInput
                  className={lexend.className}
                  placeholder={"Let's Begin"}
                  variant="unstyled"
                  size="xxl"
                  name="headerText"
                  onClick={(e) => e.stopPropagation()}
                  styles={{
                    input: {
                      ...subtitleStyles,
                      fontFamily: "inherit",
                      height: "fit-content",
                    },
                  }}
                  value={subtitle}
                  onChange={handleSubtitleInputChange}
                  ref={subtitleInputRef}
                  onFocus={() => setSelectedEditor(SelectedItemEnum.SUBTITLE)}
                  autoComplete="off"
                />

                <ActionIcon
                  className={surveyThemeStylesCx("actionIcon")}
                  variant="default"
                  radius="lg"
                  size="sm"
                  onClick={() => subtitleInputRef.current?.focus()}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
              </Stack>
            </Tooltip>

            <Tooltip label={"Edit Title"}>
              <Stack className={surveyThemeStylesCx("titleBox")}>
                <TextInput
                  className={lexend.className}
                  placeholder={"Select a Language"}
                  variant="unstyled"
                  size="xxl"
                  onClick={(e) => e.stopPropagation()}
                  styles={{
                    input: {
                      ...titleStyles,
                      fontFamily: "inherit",
                      height: "fit-content",
                    },
                  }}
                  value={title}
                  onChange={handleTitleInputChange}
                  ref={titleInputRef}
                  onFocus={() => setSelectedEditor(SelectedItemEnum.TITLE)}
                  autoComplete="off"
                />

                <ActionIcon
                  className={surveyThemeStylesCx("actionIcon")}
                  variant="default"
                  radius="lg"
                  size="sm"
                  onClick={() => titleInputRef.current?.focus()}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
              </Stack>
            </Tooltip>
          </Stack>

          <Flex className={cx("languages-list-radio-grp-container")}>
            <ScrollAreaAutosize
              mah={"100%"}
              offsetScrollbars
              scrollbarSize={10}
            >
              <MantineProvider
                theme={{
                  colors: {
                    // @ts-ignore
                    primaryColor: Array(10).fill(inputPrimaryColor),
                  },
                  primaryColor: "primaryColor",
                }}
              >
                <Radio.Group value={lang} onChange={setLang} miw={"200px"}>
                  <SingleSelectCard
                    data={languages}
                    selectedValue={lang}
                    sizeTrim
                  />
                </Radio.Group>
              </MantineProvider>
            </ScrollAreaAutosize>
          </Flex>

          <Flex
            className={`${surveyThemeStylesCx("buttonBox")} ${cx("start-btn-text-input-wrapper")}`}
          >
            <Flex
              p={"0.625rem 0.875rem"}
              className={cx("start-btn-text-input-container")}
              style={{
                backgroundColor: buttonStyles.backgroundColor,
                borderRadius: "2rem",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <TextInput
                className={cx("start-btn-text-input")}
                onChange={handleStartBtnTextChange}
                value={startBtnLabel}
                placeholder={"Start Survey"}
                variant="unstyled"
                name="buttonText"
                size="xs"
                rightSection={
                  <IconChevronRight
                    color={buttonStyles.color}
                    size={"1.5rem"}
                  />
                }
                ref={startBtnInputRef}
                onFocus={() => setSelectedEditor(SelectedItemEnum.BUTTON)}
                styles={{
                  input: {
                    color: buttonStyles.color,
                  },
                }}
                autoComplete="off"
              />

              <ActionIcon
                variant="default"
                radius="lg"
                size="sm"
                className={surveyThemeStylesCx("actionIcon")}
                onClick={() => startBtnInputRef.current?.focus()}
              >
                <IconEdit style={{ width: "70%", height: "70%" }} />
              </ActionIcon>
            </Flex>
          </Flex>
        </Stack>
      </Flex>
    </CreditsCard>
  );
}

export default LanguagePage;
