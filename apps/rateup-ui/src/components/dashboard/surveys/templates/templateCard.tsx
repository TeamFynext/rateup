import { useTranslation } from "react-i18next";

import { CreditsCard } from "@/components/Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "@/components/Layout/TakeSurveyLayout/utils.ts";
import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage/index.tsx";
import { useSelectedPreview } from "@/components/Survey/SurveyTheme/SurveyThemeContext.tsx";
import { PageType } from "@/types/enums.ts";

import classes from "@/components/Survey/SurveyTheme/SurveyTheme.module.css";

export default function TemplateCard({ survey }) {
  const webSurveyPagesTheme = survey?.webSurveyPagesTheme;
  const surveyThemeObj = survey?.webSurveyTheme?.theme;
  const questionsArr = survey?.questions;
  const selectedPreview = useSelectedPreview();
  const { t: translations } = useTranslation();
  const shouldUseSurveyTheme = webSurveyPagesTheme["welcomeTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["welcomeTheme"];

  const defaultTitleSubtitleStartButtonTexts = {
    titleText: translations("Welcome") || "Welcome",
    subtitleText: translations("Welcome to the survey") || "Welcome to the survey",
    startButtonText: translations("Start Survey") || "Start Survey",
  };
  const welcomeTypeQuestionObj =
    questionsArr?.find((question) => question.type === PageType.Welcome) ||
    defaultTitleSubtitleStartButtonTexts;
  const { titleText, subtitleText } = welcomeTypeQuestionObj;

  const titleStyles = requiredThemeObj?.title?.styles;
  let subtitleStyles = requiredThemeObj?.subtitle?.styles;
  if (!subtitleStyles) {
    subtitleStyles = {
      color: titleStyles?.color,
      fontWeight: "400",
      fontSize: 16,
      textAlign: "center",
    };
  }

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText ?? ""}</span></p>`
    : titleText;

  return (
    <div className="flex h-50 w-75 items-center" style={{ backgroundColor }}>
      <CreditsCard
        enableCredits={backgroundImageSrc?.startsWith("https://images.unsplash.com")}
        url={backgroundImageSrc}
      >
        <div
          className={classes.parentContainer}
          style={{
            height: "100%",
            width: "100%",
            backgroundImage: backgroundImageSrc ? `url(${backgroundImageSrc})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative flex h-full flex-col items-center justify-center">
            <div
              className="mt-6 flex w-4/5 flex-col gap-4 text-center"
              style={{
                fontFamily: "inherit",
                fontSize: "20px",
                ...titleStyles,
                maxWidth: "200px",
              }}
            >
              <span className="block truncate" dangerouslySetInnerHTML={{ __html: newTitle }} />
            </div>
          </div>
        </div>
      </CreditsCard>
    </div>
  );
}
