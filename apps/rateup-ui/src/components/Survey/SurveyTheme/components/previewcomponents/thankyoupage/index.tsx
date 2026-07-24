import { useCallback, useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";

import { CreditsCard } from "../../../../../Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSurveyThemeContextValue,
} from "../../../SurveyThemeContext.tsx";
import ThemeTitle from "../../ThemeTitle.tsx";
import { getInlineStyleFromStyleObj } from "../welcomepage/index.tsx";

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
}

export default function ThankyouPageThemeView({ survey }) {
  const webSurveyPagesTheme = useSurveyThemeContextValue();

  const editSurveySelectedQuestion = useEditSurveySelectedQuestion();
  const selectedPreview = useSelectedPreview();

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId: survey.id,
  });

  const surveyThemeObj = survey?.webSurveyTheme?.theme;

  const { ref, width, height } = useElementSize<HTMLDivElement>();

  const { titleText: title, subtitleText: subtitle } = editSurveySelectedQuestion || {};

  const shouldUseSurveyTheme = webSurveyPagesTheme["thankyouTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["thankyouTheme"];

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
  const confettiEnabled = requiredThemeObj?.confettiEnabled;

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "thankyouTheme",
    selectedPreview === "mobile",
  );

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
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${title}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitle ?? ""}</span></p>`
    : title;

  return (
    <div className="flex h-full items-center" style={{ backgroundColor }}>
      <CreditsCard
        enableCredits={backgroundImageSrc?.startsWith("https://images.unsplash.com")}
        url={backgroundImageSrc}
      >
        <div
          ref={ref}
          className="relative h-full w-full bg-cover bg-center p-[25px]"
          style={{ backgroundImage: `url(${backgroundImageSrc})` }}
        >
          {confettiEnabled && <Confetti width={width} height={height} />}

          <div className="flex h-full w-full flex-col items-center justify-center">
            <ThemeTitle
              value={newTitle}
              onChange={(value) => handleSaveTitleSubtitleStartTextSave(value, "title")}
              styles={{ color: titleStyles?.color }}
            />
          </div>
        </div>
      </CreditsCard>
    </div>
  );
}
