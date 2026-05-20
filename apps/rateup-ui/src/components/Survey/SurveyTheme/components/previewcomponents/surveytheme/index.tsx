"use client";

import { useState } from "react";

import { Box } from "@mantine/core";
import _ from "lodash";

import { PageType } from "@/types/enums.ts";
import GoogleReview from "@/components/Survey/TakeSurvey/GoogleReview/index.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { ResponseSubmitted } from "@/components/(public-facing)/ws/$shortId/ResponseSubmitted.tsx";
import { surveyUploadsPath } from "@/utils/constants.ts";

import { TakeSurveyLayoutWeb } from "../../../../../Layout/TakeSurveyLayout/TakeSurveyLayoutWeb.tsx";
import TakeSurvey from "../../../../TakeSurvey/TakeSurveyComponent/index.tsx";
import { ThemeTabEnum } from "../../../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
} from "../../../SurveyThemeContext.tsx";
import IsSurveyThemePreviewContextProvider from "./isSurveyThemePreviewContext.tsx";
import styles from "./SurveyThemePreview.module.css";
import { getSurveyEditViewQuestions } from "./utils.ts";
import ThankYou from "@/components/(public-facing)/public/survey/$surveyId/end.tsx";

function SurveyThemeView({
  survey,
  previewId,
  isSurveyThemePreview = true,
  isSurveyThemeEditView = false,
}) {
  const selectedPageTab = useSelectedPageTab();
  const isSurveyPageTabSelected = selectedPageTab === ThemeTabEnum.SURVEY;

  const surveyTheme = useSurveyThemeContextValue();
  const surveyCopy = _.cloneDeep(survey);

  const userInfo = useUser();
  const userObj = userInfo?.user;
  const orgLogo = userObj?.orgLogo;
  const orgLogoUrl = orgLogo ? `${surveyUploadsPath}${orgLogo}` : "";

  // empty if its not review page, contains surveyLanguage if its review page
  const [isReviewPage, setIsReviewPage] = useState<string>("");

  const [isThankyouPage, setIsThankyouPage] = useState(false);
  const [isDefaultThankyouPage, setIsDefaultThankyouPage] = useState(false);

  if (isSurveyPageTabSelected) {
    surveyCopy.webSurveyTheme.theme = surveyTheme;
  } else if (!isSurveyPageTabSelected) {
    surveyCopy.webSurveyPagesTheme = surveyTheme;
  }

  if (isSurveyThemeEditView) {
    const questions = getSurveyEditViewQuestions(survey.questions);
    surveyCopy.questions = questions;
  }

  let componentToBeRendered = null;
  if (isReviewPage && !isSurveyThemeEditView) {
    componentToBeRendered = (
      <GoogleReview isSurveyPreview orgLogoUrl={orgLogoUrl} survey={survey} />
    );
  } else if (isThankyouPage && !isSurveyThemeEditView) {
    const thankyouTypePageQuestionObj = surveyCopy?.questions?.find(
      (question) => question?.type === PageType.ThankYou,
    );

    const titleText = thankyouTypePageQuestionObj?.titleText;
    const subtitleText = thankyouTypePageQuestionObj?.subtitleText || null;

    componentToBeRendered = (
      <ThankYou
        fromShortUrl={true}
        surveyThemeData={surveyCopy?.webSurveyTheme?.theme}
        pagesThemeData={surveyCopy?.webSurveyPagesTheme}
        titleText={titleText}
        subtitleText={subtitleText}
        isSurveyPreview={true}
      />
    );
  } else if (isDefaultThankyouPage && !isSurveyThemeEditView) {
    componentToBeRendered = <ResponseSubmitted isSurveyPreview={true} />;
  } else {
    componentToBeRendered = (
      <TakeSurveyLayoutWeb survey={surveyCopy} previewId={previewId}>
        <TakeSurvey
          survey={surveyCopy}
          setIsReviewPage={setIsReviewPage}
          setIsThankyouPage={setIsThankyouPage}
          setIsDefaultThankyouPage={setIsDefaultThankyouPage}
          fromShortUrl={true}
        />
      </TakeSurveyLayoutWeb>
    );
  }

  return (
    <Box
      id={previewId}
      className={`${styles["survey-theme-preview-container"]} survey-theme-preview-container`}
    >
      <IsSurveyThemePreviewContextProvider
        isSurveyThemePreview={isSurveyThemePreview}
        isSurveyThemeEditView={isSurveyThemeEditView}
      >
        {componentToBeRendered}
      </IsSurveyThemePreviewContextProvider>
    </Box>
  );
}

export default SurveyThemeView;
