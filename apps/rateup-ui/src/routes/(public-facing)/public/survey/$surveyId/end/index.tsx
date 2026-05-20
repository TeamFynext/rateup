import { createFileRoute, redirect } from "@tanstack/react-router";

import { PageType } from "@/types/enums.ts";
import {
  getPublicSurvey,
  getPublicSurveyGoogleLink,
} from "@/backend/surveys/survey.api";
import { getPublicReviewsBySurveyTeamMapId } from "@/backend/team/reviewSuggestion/reviewSuggestion.api";
import { ReviewPagePlatform } from "@/components/Survey/Question/QuestionReviewPageEditor/index.tsx";
import ThankYou from "@/components/(public-facing)/public/survey/$surveyId/end";


export const Route = createFileRoute(
  "/(public-facing)/public/survey/$surveyId/end/",
)({
  component: End,
});

async function End(props) {
  const { surveyId } = await props.params;
  const { msg, language } = await props.query;

  const propsToPass: any = {
    enableGoogleReview: false,
  };

  const defaultTitleSubtitleTexts = {
    titleText: `<h3 style="text-align: center">Thank you</h3><p style="text-align: center" >Thank you for taking the survey</p>`,
  };

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
    propsToPass.googleLink = googleLink;
    propsToPass.reviews = reviews;
    const reviewPageLinks = { ...survey.reviewPageLinks };
    if ("" in reviewPageLinks || googleLink?.length) {
      reviewPageLinks[ReviewPagePlatform.Google] =
        reviewPageLinks[""] ?? googleLink;
      delete reviewPageLinks[""];
    }
    propsToPass.reviewPageLinks = reviewPageLinks;
    const hasGoogleLink = Object.keys(propsToPass.reviewPageLinks).includes(
      ReviewPagePlatform.Google,
    );
    if (hasGoogleLink) propsToPass.enableGoogleReview = true;
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      // @ts-ignore
      propsToPass.surveyThemeData = survey?.webSurveyTheme?.theme;
      propsToPass.pagesThemeData = survey?.webSurveyPagesTheme;
      propsToPass.titleText =
        thankyouPageTypeObj.titleText || defaultTitleSubtitleTexts.titleText;
      propsToPass.subtitleText = thankyouPageTypeObj?.subtitleText || null;
    }
  } else {
    const survey = await getPublicSurvey(surveyId);
    const questions = survey.questions;
    const thankyouPageTypeObj = questions?.find(
      (questionObj) => questionObj.type === PageType.ThankYou,
    );
    if (survey) {
      propsToPass.redirect = survey.redirect;
      propsToPass.kioskMode = survey.kioskMode ? "y" : "n";
      propsToPass.surveyThemeData = survey?.webSurveyTheme?.theme;
      propsToPass.pagesThemeData = survey?.webSurveyPagesTheme;
      propsToPass.titleText =
        thankyouPageTypeObj.titleText || defaultTitleSubtitleTexts?.titleText;
      propsToPass.subtitleText = thankyouPageTypeObj?.subtitleText ?? null;
    }
  }
  return (
    <ThankYou
      redirect={redirect}
      kioskMode={propsToPass?.kioskMode ? "y" : "n"}
      surveyIdValue={surveyId}
      fromShortUrl={false}
      surveyThemeData={propsToPass?.surveyThemeData}
      pagesThemeData={propsToPass?.pagesThemeData}
      titleText={propsToPass?.titleText || defaultTitleSubtitleTexts.titleText}
      subtitleText={propsToPass?.subtitleText || null}
      enableGoogleReview={propsToPass?.enableGoogleReview}
      googleLink={propsToPass?.googleLink || ""}
      reviewPageLinks={propsToPass?.reviewPageLinks || {}}
      reviews={propsToPass?.reviews || []}
    />
  );
}
