import { Box } from "@mantine/core";
import _ from "lodash";

import { TakeSurveyLayoutWeb } from "../../../../../Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import TakeSurvey from "../../../../TakeSurvey/TakeSurveyComponent";
import { ThemeTabEnum } from "../../../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
} from "../../../SurveyThemeContext";
import IsSurveyThemePreviewContextProvider from "./isSurveyThemePreviewContext";
import styles from "./SurveyThemePreview.module.css";
import { editViewQuestionsArr } from "./utils";

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
  if (isSurveyPageTabSelected) {
    surveyCopy.webSurveyTheme.theme = surveyTheme;
  } else if (!isSurveyPageTabSelected) {
    surveyCopy.webSurveyPagesTheme = surveyTheme;
  }

  if (isSurveyThemeEditView) {
    surveyCopy.questions = editViewQuestionsArr;
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
        <TakeSurveyLayoutWeb survey={surveyCopy} previewId={previewId}>
          <TakeSurvey
            survey={surveyCopy}
            setIsReviewPage={false}
            fromShortUrl={true}
          />
        </TakeSurveyLayoutWeb>
      </IsSurveyThemePreviewContextProvider>
    </Box>
  );
}

export default SurveyThemeView;
