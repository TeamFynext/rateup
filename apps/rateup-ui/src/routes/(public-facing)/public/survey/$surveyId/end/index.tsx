import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";

import { getPublicSurvey, getPublicSurveyGoogleLink } from "@/backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "@/backend/team/reviewSuggestion/reviewSuggestion.api";
import ThankYou from "@/components/(public-facing)/public/survey/$surveyId/end";
import { ReviewPagePlatform } from "@/components/Survey/Question/QuestionReviewPageEditor/index.tsx";
import { PageType } from "@/types/enums.ts";

export const Route = createFileRoute("/(public-facing)/public/survey/$surveyId/end/")({
  component: End,
  validateSearch: z.object({
    language: z.string().optional(),
    msg: z.string().optional(),
  }),

  loaderDeps: ({ search: { language, msg } }) => ({ language, msg }),

  loader: async ({ params, deps: { language, msg } }) => {
    const { surveyId } = params;
    if (msg == "thanks") {
      const [googleLink, reviews, survey] = await Promise.all([
        getPublicSurveyGoogleLink(surveyId),
        getPublicReviewsBySurveyTeamMapId(surveyId, language),
        getPublicSurvey(surveyId),
      ]);
      const questions = survey.questions;
      const thankyouPageTypeObj = questions?.find(
        (questionObj) => questionObj.type === PageType.ThankYou,
      );
      const reviewPageLinks = { ...survey.reviewPageLinks };
      if ("" in reviewPageLinks || googleLink?.length) {
        reviewPageLinks[ReviewPagePlatform.Google] = reviewPageLinks[""] ?? googleLink;
        delete reviewPageLinks[""];
      }
      return {
        surveyId,
        googleLink,
        reviews,
        reviewPageLinks,
        redirect: survey.redirect,
        kioskMode: survey.kioskMode ? "y" : "n",
        surveyThemeData: survey?.webSurveyTheme?.theme,
        pagesThemeData: survey?.webSurveyPagesTheme,
        titleText:
          thankyouPageTypeObj.titleText ||
          `<h3 style="text-align: center">Thank you</h3><p style="text-align: center" >Thank you for taking the survey</p>`,
        subtitleText: thankyouPageTypeObj?.subtitleText ?? null,
      };
    } else {
      const survey = await getPublicSurvey(surveyId);
      const questions = survey.questions;
      const thankyouPageTypeObj = questions?.find(
        (questionObj) => questionObj.type === PageType.ThankYou,
      );
      return {
        surveyId,
        redirect: survey.redirect,
        kioskMode: survey.kioskMode ? "y" : "n",
        surveyThemeData: survey?.webSurveyTheme?.theme,
        pagesThemeData: survey?.webSurveyPagesTheme,
        titleText:
          thankyouPageTypeObj.titleText ||
          `<h3 style="text-align: center">Thank you</h3><p style="text-align: center" >Thank you for taking the survey</p>`,
        subtitleText: thankyouPageTypeObj?.subtitleText ?? null,
      };
    }
  },
});

function End() {
  const propsToPass = Route.useLoaderData();
  return (
    <ThankYou
      redirect={redirect}
      kioskMode={propsToPass?.kioskMode ? "y" : "n"}
      surveyIdValue={propsToPass?.surveyId}
      fromShortUrl={false}
      surveyThemeData={propsToPass?.surveyThemeData}
      pagesThemeData={propsToPass?.pagesThemeData}
      titleText={propsToPass?.titleText}
      subtitleText={propsToPass?.subtitleText || null}
      enableGoogleReview={propsToPass?.enableGoogleReview}
      googleLink={propsToPass?.googleLink || ""}
      reviewPageLinks={propsToPass?.reviewPageLinks || {}}
      reviews={propsToPass?.reviews || []}
    />
  );
}
