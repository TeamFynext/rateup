"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Box,
  Flex,
  Image,
  MantineProvider,
  Radio,
  ScrollAreaAutosize,
  Stack,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import AutosaveInput from "@/components/input/AutosaveInput/index.tsx";
import startBtnWrapperStyles from "@/components/Survey/SurveyTheme/SurveyTheme.module.css";

import { CreditsCard } from "../../../../../Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";
import { SingleSelectCard } from "../../../../TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard.tsx";
import surveyThemeStyles from "../../../SurveyTheme.module.css";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSetOpenEditors,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext.tsx";
import ThemeTitle from "../../ThemeTitle.tsx";
import { getInlineStyleFromStyleObj } from "../welcomepage/index.tsx";
import styles from "./languagePage.module.css";

const cx = classNames.bind(styles);
const surveyThemeStylesCx = classNames.bind(surveyThemeStyles);

function LanguagePage({ survey }) {
  const webSurveyPagesTheme = useSurveyThemeContextValue();
  const surveyThemeObj = survey?.webSurveyTheme?.theme;

  const selectedPreview = useSelectedPreview();
  const setOpenEditors = useSetOpenEditors();

  const subtitleInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const startBtnInputRef = useRef(null);

  const surveyThemeDispatch = useSurveyThemeStateDispatch();
  const editSurveySelectedQuestion = useEditSurveySelectedQuestion();
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId: survey.id,
  });

  const languages = survey.languages;
  const [lang, setLang] = useState(languages[0]);

  const surveyTheme = survey?.webSurveyTheme?.theme?.surveyTheme;
  const {
    logo: { logo: logoUrl, styles: logoStyles },
  } = surveyTheme;

  const isOrgLogoPresent = logoUrl?.length > 0;
  const isMobile = selectedPreview === "mobile";

  const shouldUseSurveyTheme =
    webSurveyPagesTheme["languageTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["languageTheme"];

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "languageTheme",
    isMobile,
  );

  const titleStyles = requiredThemeObj?.title?.styles;
  let subtitleStyles = requiredThemeObj?.subtitle?.styles;
  if (!subtitleStyles) {
    subtitleStyles = {
      color: titleStyles?.color,
      fontWeight: "600",
      fontSize: 20,
      textAlign: "center",
    };
  }
  const buttonStyles = requiredThemeObj?.button?.styles;
  const inputPrimaryColor = requiredThemeObj?.input?.primaryColor;

  const {
    titleText: title,
    subtitleText: subtitle,
    startButtonText: startBtnLabel,
  } = editSurveySelectedQuestion || {};

  useEffect(() => {
    if (startBtnInputRef.current) {
      startBtnInputRef.current.setAttribute("size", startBtnLabel?.length - 1);
    }
  }, [startBtnLabel]);

  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  const handleSaveTitleSubtitleStartTextSave = useCallback(
    async (value, name) => {
      const data = {};
      switch (name) {
        case "title": {
          data["titleText"] = value;
          if (editSurveySelectedQuestion["subtitleText"])
            data["subtitleText"] = null;
          break;
        }
        case "subtitle": {
          data["subtitleText"] = value;
          break;
        }
        case "startBtn": {
          data["startButtonText"] = value;
          break;
        }
      }
      if (editSurveySelectedQuestion) {
        await questionUpdateMutation.mutateAsync({
          qId: editSurveySelectedQuestion["id"],
          data,
        });
      }
    },
    [editSurveySelectedQuestion],
  );

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitle
    ? `<p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitle ?? ""}</span></p><p style="text-align:center;"><span style="${titleStyleNew}">${title}</span></p>`
    : title;

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
            <Stack className={surveyThemeStylesCx("titleBox")}>
              <ThemeTitle
                value={newTitle}
                onChange={(value) =>
                  handleSaveTitleSubtitleStartTextSave(value, "title")
                }
                styles={{ color: titleStyles?.color }}
              />
            </Stack>
          </Stack>

          <Flex className={cx("languages-list-radio-grp-container")}>
            <ScrollAreaAutosize
              mah={"100%"}
              offsetScrollbars
              scrollbarSize={10}
            >
              <MantineProvider
                getRootElement={() => {
                  return typeof window === "undefined"
                    ? undefined
                    : document.querySelector(
                        `.${cx("languages-list-radio-grp-container")}`,
                      );
                }}
                cssVariablesSelector={`.${cx("languages-list-radio-grp-container")}`}
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
            className={`${startBtnWrapperStyles["titleBox"]} ${cx("start-btn-wrapper")}`}
          >
            <Box
              className={`${cx("autosave-input-right-chevron-icon-container")}`}
            >
              <AutosaveInput
                className={`${startBtnWrapperStyles["start-btn-input-div"]} ${cx("start-btn-auto-save-input-div")}`}
                name="startBtn"
                value={startBtnLabel}
                onSave={handleSaveTitleSubtitleStartTextSave}
                style={{
                  color: "inherit",
                  fontSize: "18px",
                  textAlign: "center",
                  minWidth: "150px",
                  alignSelf: "center",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  ...buttonStyles,
                  borderRadius: "0.625rem",
                }}
              />
              <IconChevronRight
                className={cx("start-btn-right-chevron")}
                color={buttonStyles.color}
                size={"1.5rem"}
              />
            </Box>
          </Flex>
        </Stack>
      </Flex>
    </CreditsCard>
  );
}

export default LanguagePage;
