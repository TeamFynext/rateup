import { IconChevronRight } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import AutosaveInput from "@/components/input/AutosaveInput/index.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn } from "@/lib/utils.ts";

import { CreditsCard } from "../../../../../Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";
import { SingleSelectCard } from "../../../../TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard.tsx";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSurveyThemeContextValue,
} from "../../../SurveyThemeContext.tsx";
import ThemeTitle from "../../ThemeTitle.tsx";
import { getInlineStyleFromStyleObj } from "../welcomepage/index.tsx";

import startBtnWrapperStyles from "@/components/Survey/SurveyTheme/SurveyTheme.module.css";

function LanguagePage({ survey }: { survey: Survey }) {
  const webSurveyPagesTheme = useSurveyThemeContextValue();
  const surveyThemeObj = survey?.webSurveyTheme?.theme;

  const selectedPreview = useSelectedPreview();

  const startBtnInputRef = useRef<HTMLElement | null>(null);

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

  const isOrgLogoPresent = (logoUrl?.length ?? 0) > 0;
  const isMobile = selectedPreview === "mobile";

  const shouldUseSurveyTheme = webSurveyPagesTheme["languageTheme"]?.useSurveyTheme;
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

  const {
    titleText: title,
    subtitleText: subtitle,
    startButtonText: startBtnLabel,
  } = editSurveySelectedQuestion || {};

  useEffect(() => {
    if (startBtnInputRef.current) {
      startBtnInputRef.current.setAttribute("size", String((startBtnLabel?.length ?? 0) - 1));
    }
  }, [startBtnLabel]);

  const isUnsplashImage = backgroundImageSrc?.startsWith("https://images.unsplash.com");

  const handleSaveTitleSubtitleStartTextSave = useCallback(
    async (value: string, name?: string) => {
      const data: {
        titleText?: string;
        subtitleText?: string | null;
        startButtonText?: string;
      } = {};
      switch (name) {
        case "title": {
          data["titleText"] = value;
          if (editSurveySelectedQuestion?.["subtitleText"]) data["subtitleText"] = null;
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
    <CreditsCard enableCredits={!!isUnsplashImage} url={backgroundImageSrc}>
      <div
        className={cn(
          "flex h-full flex-col gap-4 bg-no-repeat bg-center bg-cover",
          isOrgLogoPresent ? "pt-4" : "pt-10",
        )}
        style={{
          backgroundColor,
          backgroundImage: `url(${backgroundImageSrc})`,
        }}
      >
        {isOrgLogoPresent && (
          <div className="flex justify-center">
            <img
              src={logoUrl ?? undefined}
              style={logoStyles}
              alt="logo"
              className="max-w-full object-contain"
            />
          </div>
        )}

        <div className="flex flex-1 basis-0 flex-col items-center justify-center gap-8 overflow-hidden px-10">
          <div className="flex w-full flex-col items-stretch gap-4">
            <div className={startBtnWrapperStyles["titleBox"]}>
              <ThemeTitle
                value={newTitle ?? ""}
                onChange={(value: string) => handleSaveTitleSubtitleStartTextSave(value, "title")}
                styles={{ color: titleStyles?.color }}
              />
            </div>
          </div>

          <div className="flex shrink items-center justify-center overflow-hidden">
            <ScrollArea className="max-h-full">
              <SingleSelectCard data={languages} selectedValue={lang} onChange={setLang} sizeTrim />
            </ScrollArea>
          </div>

          <div className={cn(startBtnWrapperStyles["titleBox"], "flex justify-center")}>
            <div className="relative">
              <AutosaveInput
                className={startBtnWrapperStyles["start-btn-input-div"]}
                name="startBtn"
                value={startBtnLabel ?? ""}
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
                className="absolute right-[0.625rem] top-[calc(50%-0.75rem)]"
                color={buttonStyles?.color}
                size="1.5rem"
              />
            </div>
          </div>
        </div>
      </div>
    </CreditsCard>
  );
}

export default LanguagePage;
