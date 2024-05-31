import { Box } from "@mantine/core";
import _ from "lodash";
import { TakeSurveyLayoutWeb } from "../../../../../Layout/TakeSurveyLayout/TakeSurveyLayoutWeb";
import TakeSurvey from "../../../../TakeSurvey/TakeSurveyComponent";
import { useSurveyThemeContextValue } from "../../../SurveyThemeContext";
import styles from "./SurveyThemePreview.module.css";
import IsSurveyThemePreviewContextProvider from "./isSurveyThemePreveiwContext";

function SurveyThemeView({ survey }) {
  const surveyTheme = useSurveyThemeContextValue();
  const surveyCopy = _.cloneDeep(survey);
  surveyCopy.webSurveyTheme.theme = surveyTheme;

  return (
    <Box className={styles["survey-theme-preview-container"]}>
      <IsSurveyThemePreviewContextProvider value={true}>
        <TakeSurveyLayoutWeb survey={surveyCopy}>
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
