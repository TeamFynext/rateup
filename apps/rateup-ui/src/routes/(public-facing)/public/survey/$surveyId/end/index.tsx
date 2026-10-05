import { createFileRoute } from "@tanstack/react-router";

import ThankYou from "@/components/(public-facing)/public/survey/$surveyId/end";
import { PageType, ReviewPagePlatform } from "@/types/enums.ts";
import { optionalString } from "@/utils/search.ts";

export const Route = createFileRoute("/(public-facing)/public/survey/$surveyId/end/")({
  component: End,
  validateSearch: (search: Record<string, unknown>): { language?: string; msg?: string } => ({
    language: optionalString(search.language),
    msg: optionalString(search.msg),
  }),

  loaderDeps: ({ search: { language, msg } }) => ({ language, msg }),

  loader: async ({ params, deps: { language, msg } }) => {
    const { surveyId } = params;
    // Imported here: route options land in the client entry, and these bring axios.
    const { getPublicSurvey, getPublicSurveyGoogleLink } =
      await import("@/backend/surveys/survey.api");
    if (msg == "thanks") {
      const { getPublicReviewsBySurveyTeamMapId } =
        await import("@/backend/team/reviewSuggestion/reviewSuggestion.api");
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
        // The endpoint answers `{ reviews, reviewLink }`; the page renders the suggestions.
        reviews: reviews.reviews,
        reviewPageLinks,
        redirect: survey.redirect,
        kioskMode: survey.kioskMode ? "y" : "n",
        surveyThemeData: survey?.webSurveyTheme?.theme,
        pagesThemeData: survey?.webSurveyPagesTheme,
        titleText:
          thankyouPageTypeObj?.titleText ||
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
          thankyouPageTypeObj?.titleText ||
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
      redirect={propsToPass?.redirect}
      kioskMode={propsToPass?.kioskMode ? "y" : "n"}
      surveyIdValue={propsToPass?.surveyId}
      fromShortUrl={false}
      surveyThemeData={propsToPass?.surveyThemeData}
      pagesThemeData={propsToPass?.pagesThemeData}
      titleText={propsToPass?.titleText}
      subtitleText={propsToPass?.subtitleText || null}
      googleLink={propsToPass?.googleLink || ""}
      reviewPageLinks={propsToPass?.reviewPageLinks || {}}
      reviews={propsToPass?.reviews || []}
    />
  );
}
