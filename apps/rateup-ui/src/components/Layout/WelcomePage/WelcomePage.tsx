import type { CSSProperties } from "react";

import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage/index.tsx";
import type { SurveyThemePage } from "@/components/Survey/SurveyTheme/surveyThemeReducer.ts";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { PageType } from "@/types/enums.ts";
import { cordinateStyle } from "@/utils/index.ts";

const _buttonStyles = {
  backgroundColor: "var(--primary)",
  borderRadius: "48px",
  padding: "10px",
  paddingLeft: "20px",
  paddingRight: "20px",
};

function WelcomePage({
  surveyThemeData,
  pagesThemeData,
  onStart,
  orgLogoSrc,
  orgLogoStyles,
  questionsArr,
  isMobile,
}: Readonly<{
  surveyThemeData: Record<string, SurveyThemePage> | undefined;
  onStart: () => void;
  largeScreen?: boolean;
  orgLogoSrc: string | null;
  orgLogoStyles: CSSProperties | undefined;
  questionsArr: Question[] | undefined;
  pagesThemeData: Record<string, SurveyThemePage> | undefined;
  isMobile: boolean;
}>) {
  const defaultTitleSubtitleStartButtonTexts: Pick<
    Question,
    "titleText" | "subtitleText" | "startButtonText"
  > = {
    titleText: `<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>`,
    subtitleText: null,
    startButtonText: "Start Survey",
  };

  const welcomeTypeQuestionObj =
    questionsArr?.find((question: Question) => question.type === PageType.Welcome) ||
    defaultTitleSubtitleStartButtonTexts;
  const { titleText, subtitleText, startButtonText } = welcomeTypeQuestionObj;

  const shouldUseSurveyTheme = pagesThemeData?.["welcomeTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeData?.["surveyTheme"]
    : pagesThemeData?.["welcomeTheme"];

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

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText}</span></p>`
    : titleText;

  return (
    <div className="flex justify-center items-center h-full">
      <div
        className={cn(
          "flex h-full max-w-[1920px] flex-col items-center justify-center gap-8 p-5",
          isMobile ? "w-full" : "w-[80%]",
        )}
      >
        {orgLogoSrc && (
          <img
            src={orgLogoSrc}
            alt="Logo"
            className="object-contain"
            style={{ ...orgLogoStyles }}
          />
        )}
        <div
          dangerouslySetInnerHTML={{
            __html: newTitle ?? "",
          }}
          style={{ color: titleStyles?.color }}
        />
        <div
          style={{
            display: "flex",
            ...(buttonPosition?.x ? cordinateStyle(buttonPosition.x) : {}),
            ...(buttonPosition?.y ? cordinateStyle(buttonPosition.y) : {}),
          }}
        >
          <Button
            style={
              buttonStyles
                ? {
                    ...buttonStyles,
                    height: "auto",
                    fontSize: "1.125rem",
                    borderRadius: "0.625rem",
                    padding: "0.75rem 1.5rem",
                    fontFamily: "inherit",
                  }
                : { ..._buttonStyles, fontFamily: "inherit" }
            }
            onClick={onStart}
          >
            {startButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
