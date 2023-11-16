import { axiosClient, axiosClientIP } from "../apiClient";
const WELCOMETHEME = "/welcome";
const WELCOMETHEME_PUBLIC_URL = "/public/welcome";

export const createWelcomeTheme = (data) =>
  axiosClient.post(`${WELCOMETHEME}/create`, data);

export async function getPublicwelcomeTheme(welcomeThemeId: string) {
  const res = await axiosClientIP.get(
    `${WELCOMETHEME_PUBLIC_URL}/surveys/${welcomeThemeId}`,
  );
  return res.data;
}

export const updateWelcomeTheme = (data) =>
  axiosClient.post(`${WELCOMETHEME}/update/${data?.id}`, data);

export async function getWelcomeThemeBySurveyId(surveyId: string) {
  if (!surveyId) return undefined;
  const res = await axiosClient.get(`${WELCOMETHEME}/survey/${surveyId}`);
  return res.data;
}
