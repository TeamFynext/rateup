import { createFileRoute } from "@tanstack/react-router";

import { getPublicSurvey } from "@/backend/surveys/survey.api";
import ThankYou from "@/components/(public-facing)/public/survey/$surveyId/end";
import { PageType } from "@/types/enums.ts";

export const Route = createFileRoute("/(public-facing)/ws/$shortId/end/")({
  loader: async ({ params }) => {
    const {
      id: surveyId,
      kioskMode,
      redirect,
      webSurveyTheme: { theme: surveyThemeData },
      webSurveyPagesTheme: pagesThemeData,
      questions,
    } = await getPublicSurvey(params.shortId);

    return {
      surveyId,
      kioskMode,
      redirect,
      surveyThemeData,
      pagesThemeData,
      questions,
    };
  },
  component: End,
});

function End() {
  const { surveyId, kioskMode, redirect, surveyThemeData, pagesThemeData, questions } =
    Route.useLoaderData();

  const defaultTitleSubtitleTexts = {
    titleText: `<h3 style="text-align: center">Thank you</h3><p style="text-align: center">Thank you for taking the survey</p>`,
  };

  const texts = questions?.find((questionObj: Question) => questionObj.type === PageType.ThankYou);

  return (
    <ThankYou
      redirect={redirect}
      kioskMode={kioskMode ? "y" : "n"}
      surveyIdValue={surveyId}
      fromShortUrl={true}
      surveyThemeData={surveyThemeData}
      pagesThemeData={pagesThemeData}
      titleText={texts?.titleText || defaultTitleSubtitleTexts.titleText}
      subtitleText={texts?.subtitleText || null}
    />
  );
}
