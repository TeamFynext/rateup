import type { SurveyTheme } from "@/components/Survey/SurveyTheme/surveyTheme.types";

import { axiosClient } from "../apiClient";

const THEME_API_PATH = "/surveyTheme";

export const getSurveyTheme = async (surveyThemeId: string) => {
  const response = await axiosClient.get(`${THEME_API_PATH}/${surveyThemeId}`);
  return response.data;
};

export const getAllThemes = async () => {
  const response = await axiosClient.get(`${THEME_API_PATH}`);
  return response.data;
};

export const createNewTheme = async ({
  name: themeName,
  surveyId = null,
}: {
  name: string;
  surveyId?: string | null;
}) => {
  const response = await axiosClient.post(`${THEME_API_PATH}`, {
    themeName,
    surveyId: surveyId,
  });
  return response.data;
};

export const updateSurveyTheme = async ({
  surveyThemeId,
  body,
}: {
  surveyThemeId: string;
  body: { surveyId: string; theme: SurveyTheme };
}) => {
  const response = await axiosClient.put(`${THEME_API_PATH}/${surveyThemeId}`, body);
  return response.data;
};

export const renameSurveyTheme = async ({
  surveyThemeId,
  body,
}: {
  surveyThemeId: string;
  body: { name: string };
}) => {
  const response = await axiosClient.patch(`${THEME_API_PATH}/${surveyThemeId}`, body);
  return response.data;
};

export const deleteTheme = async (surveyThemeId: string) => {
  const response = await axiosClient.delete(`${THEME_API_PATH}/${surveyThemeId}`);
  return response.data;
};

export const updateAllThemes = async () => {
  const response = await axiosClient.post(`${THEME_API_PATH}/updateWebSurveyThemes`);
  return response.data;
};
