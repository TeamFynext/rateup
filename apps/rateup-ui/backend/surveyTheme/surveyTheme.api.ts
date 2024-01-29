import { SurveyTheme } from "../../components/Survey/SurveyTheme/surveyTheme.types";
import { axiosClient } from "../apiClient";

const THEME_API_PATH = "/surveyTheme";

export const getSurveyTheme = async (surveyId: string) => {
  const response = await axiosClient.get(`${THEME_API_PATH}/${surveyId}`);
  return response.data;
};

export const updateSurveyTheme = async ({
  surveyThemeId,
  body,
}: {
  surveyThemeId: string;
  body: SurveyTheme;
}) => {
  const response = await axiosClient.put(
    `${THEME_API_PATH}/${surveyThemeId}`,
    body,
  );
  return response.data;
};
