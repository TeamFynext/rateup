import { isNumber } from "@tiptap/react";
import { useCallback } from "react";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import AutosaveInput from "@/components/input/AutosaveInput/index.tsx";
import { cordinateStyle } from "@/utils/index.ts";

import { CreditsCard } from "../../../../../Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSurveyThemeContextValue,
} from "../../../SurveyThemeContext.tsx";
import ThemeTitle from "../../ThemeTitle.tsx";

import classes from "../../../SurveyTheme.module.css";

export default function WelcomePageThemeView({ survey }) {
  const webSurveyPagesTheme = useSurveyThemeContextValue();

  const editSurveySelectedQuestion = useEditSurveySelectedQuestion();
  const selectedPreview = useSelectedPreview();
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId: survey.id,
  });

  const surveyThemeObj = survey?.webSurveyTheme?.theme;
  const {
    surveyTheme: {
      logo: { logo: logoUrl, styles: logoStyles },
    },
  } = surveyThemeObj;

  const shouldUseSurveyTheme = webSurveyPagesTheme["welcomeTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["welcomeTheme"];

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
  const buttonStyles = requiredThemeObj?.button?.styles;
  let buttonPosition = requiredThemeObj?.button?.position;
  if (!buttonPosition) {
    buttonPosition = { x: "CENTER", y: "DEFAULT" };
  }

  const {
    titleText: title,
    subtitleText: subtitle,
    startButtonText: startBtnLabel,
  } = editSurveySelectedQuestion || {};

  const orgLogoSrc = logoUrl;
  const orgLogoStyles = logoStyles;

  const handleSaveTitleSubtitleStartTextSave = useCallback(
    async (value, name) => {
      const data = {};
      switch (name) {
        case "title": {
          data["titleText"] = value;
          if (editSurveySelectedQuestion["subtitleText"]) data["subtitleText"] = null;
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

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitle
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${title}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitle ?? ""}</span></p>`
    : title;

  return (
    <div className="flex h-full items-center" style={{ backgroundColor }}>
      <CreditsCard
        enableCredits={backgroundImageSrc?.startsWith("https://images.unsplash.com")}
        url={backgroundImageSrc}
      >
        <div
          className="relative h-full w-full p-[25px]"
          style={{
            backgroundImage: backgroundImageSrc ? `url(${backgroundImageSrc})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="relative flex h-full flex-col items-center justify-center gap-8">
            {orgLogoSrc && (
              <img
                src={orgLogoSrc}
                style={{ ...orgLogoStyles, alignSelf: "center" }}
                alt="logo"
                className="block h-auto max-w-full"
              />
            )}

            <ThemeTitle
              value={newTitle}
              onChange={(value) => handleSaveTitleSubtitleStartTextSave(value, "title")}
              styles={{ color: titleStyles?.color }}
            />
            <div
              className="relative flex w-full justify-center p-[5px]"
              style={{
                ...(buttonPosition?.x ? cordinateStyle(buttonPosition.x) : {}),
                ...(buttonPosition?.y ? cordinateStyle(buttonPosition.y) : {}),
              }}
            >
              <AutosaveInput
                className={classes["start-btn-input-div"]}
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
            </div>
          </div>
        </div>
      </CreditsCard>
    </div>
  );
}

export function getInlineStyleFromStyleObj(styles) {
  if (!styles) return "text-align:center";
  const newStyles = [];
  for (const key in styles) {
    const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    const value = isNumber(styles[key]) ? `${styles[key]}px` : `${styles[key]}`;
    newStyles.push(`${kebabKey}:${value}`);
  }
  return newStyles.join(";") + ";";
}
