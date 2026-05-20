"use client";

import { useState } from "react";

import {
  Button,
  Flex,
  Image,
  MantineProvider,
  Radio,
  ScrollAreaAutosize,
  Stack,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronRight } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { PageType } from "@/types/enums.ts";
import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage/index.tsx";

import { CreditsCard } from "../../Card/CreditsCard.tsx";
import styles from "../../Survey/SurveyTheme/components/previewcomponents/languagePage/languagePage.module.css";
import surveyThemeStyles from "../../Survey/SurveyTheme/SurveyTheme.module.css";
import { useSelectedPreview } from "../../Survey/SurveyTheme/SurveyThemeContext.tsx";
import { SingleSelectCard } from "../../Survey/TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard.tsx";
import { getBgImgAndBgColor } from "../TakeSurveyLayout/utils.ts";

const cx = classNames.bind(styles);
const surveyThemeStylesCx = classNames.bind(surveyThemeStyles);

// In below jsx the class names have words like text input since same styles from language theme preview component's styles are being used here.
function LanguageSelectionPage({
  languages,
  setSelectedLanguage,
  surveyThemeData,
  pagesThemeData,
  questionsArr,
}) {
  const [lang, setLang] = useState(languages[0]);
  const selectedPreview = useSelectedPreview();

  const {
    surveyTheme: {
      logo: { logo: logoUrl, styles: logoStyles },
    },
  } = surveyThemeData;

  const defaultTitleSubtitleStartButtonTexts = {
    titleText: `<h3 style="text-align: center">Select a Language</h3>`,
    startButtonText: "Start Survey",
  };

  const languageTypeQuestionObj =
    questionsArr?.find((question) => question.type === PageType.Language) ||
    defaultTitleSubtitleStartButtonTexts;
  const { titleText, subtitleText, startButtonText } = languageTypeQuestionObj;

  const isOrgLogoPresent = logoUrl?.length > 0;
  const isMobile =
    useMediaQuery("(max-width: 768px)") || selectedPreview === "mobile";

  const shouldUseSurveyTheme = pagesThemeData["languageTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeData["surveyTheme"]
    : pagesThemeData["languageTheme"];

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

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeData : pagesThemeData,
    shouldUseSurveyTheme ? "surveyTheme" : "languageTheme",
    isMobile,
  );

  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText ?? ""}</span></p><p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p>`
    : titleText;

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
            <div
              dangerouslySetInnerHTML={{
                __html: newTitle,
              }}
              style={{ color: titleStyles?.color }}
            />
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
            className={`${surveyThemeStylesCx("buttonBox")} ${cx("start-btn-text-input-wrapper")}`}
            justify={"center"}
          >
            <Flex
              className={cx("start-btn-text-input-container")}
              onClick={(e) => e.stopPropagation()}
              p={0}
            >
              <Button
                onClick={() => setSelectedLanguage(lang)}
                rightSection={<IconChevronRight />}
                style={{
                  backgroundColor: buttonStyles?.backgroundColor,
                  color: buttonStyles?.color,
                  fontSize: "1.125rem",
                  height: "auto",
                  padding: "0.75rem 1rem 0.75rem 1.5625rem",
                  borderRadius: "0.625rem",
                }}
              >
                {startButtonText}
              </Button>
            </Flex>
          </Flex>
        </Stack>
      </Flex>
    </CreditsCard>
  );
}

export default LanguageSelectionPage;
