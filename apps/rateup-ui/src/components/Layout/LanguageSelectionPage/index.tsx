import { IconChevronRight } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { useState } from "react";

import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage/index.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { PageType } from "@/types/enums.ts";

import { CreditsCard } from "../../Card/CreditsCard.tsx";
import { useSelectedPreview } from "../../Survey/SurveyTheme/SurveyThemeContext.tsx";
import { SingleSelectCard } from "../../Survey/TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard.tsx";
import { getBgImgAndBgColor } from "../TakeSurveyLayout/utils.ts";

import styles from "../../Survey/SurveyTheme/components/previewcomponents/languagePage/languagePage.module.css";
import surveyThemeStyles from "../../Survey/SurveyTheme/SurveyTheme.module.css";

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
  const isMobile = useMediaQuery("(max-width: 768px)") || selectedPreview === "mobile";

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

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeData : pagesThemeData,
    shouldUseSurveyTheme ? "surveyTheme" : "languageTheme",
    isMobile,
  );

  const isUnsplashImage = backgroundImageSrc?.startsWith("https://images.unsplash.com");

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText ?? ""}</span></p><p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p>`
    : titleText;

  return (
    <CreditsCard enableCredits={isUnsplashImage} url={backgroundImageSrc}>
      <div
        className={`flex ${cx("preview-language-page-container", {
          "org-logo-not-present": !isOrgLogoPresent,
        })}`}
        style={{
          backgroundColor,
          backgroundImage: `url(${backgroundImageSrc})`,
        }}
      >
        {isOrgLogoPresent && (
          <div className={`flex ${cx("logo-container")}`}>
            <img className={cx("logo")} src={logoUrl} style={logoStyles} alt="Logo" />
          </div>
        )}

        <div className={`flex flex-col gap-4 ${cx("header-radio-grp-start-btn-container")}`}>
          <div className={`flex flex-col gap-2 ${cx("header")}`}>
            <div
              dangerouslySetInnerHTML={{
                __html: newTitle,
              }}
              style={{ color: titleStyles?.color }}
            />
          </div>

          <div className={`flex ${cx("languages-list-radio-grp-container")}`}>
            <div className="max-h-full min-w-50 overflow-auto">
              <SingleSelectCard data={languages} selectedValue={lang} onChange={setLang} sizeTrim />
            </div>
          </div>

          <div
            className={`flex justify-center ${surveyThemeStylesCx("buttonBox")} ${cx("start-btn-text-input-wrapper")}`}
          >
            <div
              className={`flex ${cx("start-btn-text-input-container")}`}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: 0 }}
            >
              <Button
                onClick={() => setSelectedLanguage(lang)}
                className="h-auto rounded-[0.625rem] py-3 pr-4 pl-6.25 text-lg"
                style={{
                  backgroundColor: buttonStyles?.backgroundColor,
                  color: buttonStyles?.color,
                }}
              >
                {startButtonText}
                <IconChevronRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CreditsCard>
  );
}

export default LanguageSelectionPage;
