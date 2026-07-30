import type { RequestPayload } from "@/types/api.ts";

import { axiosClient, axiosClientIP } from "../apiClient";

const SURVEYURL = "/survey";
const SURVEY_PUBLIC_URL = "/public/survey";

export interface CreateSurveyResponse {
  title: string;
  languages: string[];
  teamId: string;
  active: boolean;
  type: string;
  getLocation: boolean;
  welcomePageEnabled: boolean;
  id: string;
}

export async function createSurvey(data: RequestPayload) {
  const res: CreateSurveyResponse = (await axiosClient.post(SURVEYURL, data)).data;
  return res;
}

export const createSurveyLandingPage = (data: RequestPayload) =>
  axiosClient.post(`${SURVEYURL}/createlanding`, data);

// -----------update landing page---------
export const updateSurveyLandingPage = (data: { id: string } & Record<string, unknown>) =>
  axiosClient.post(`${SURVEYURL}/updatelanding/${data.id}`, data);

export async function cloneSurvey(surveyId: string, teamIds: string[]) {
  if (!surveyId) return undefined;
  const data = {
    teamIds: teamIds,
  };
  const res = await axiosClient.post(`${SURVEYURL}/clone/${surveyId}`, data);
  return res.data as Survey;
}

export async function getSurveyTemplates(surveyType: string) {
  try {
    const surveyTemplates: any = (await axiosClient.get(`${SURVEYURL}/templates/${surveyType}`))
      .data;
    return surveyTemplates;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export async function getSurveys() {
  try {
    const surveys: Array<Survey> = (await axiosClient.get(SURVEYURL)).data;
    return surveys;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export async function getSurveyWithQuestions() {
  try {
    const surveys: Array<Survey> = (await axiosClient.get(`${SURVEYURL}/all/survey-with-questions`))
      .data;
    return surveys;
  } catch (e) {
    console.error(e);
  }
}

export async function getActiveSurveysSummary() {
  const surveysSummary: SurveySummaryData = (await axiosClient.get(`${SURVEYURL}/summary/active`))
    .data;
  return surveysSummary;
}

export async function getSurveysSummary() {
  const allSurveysSummary: SurveySummaryData = (await axiosClient.get(`${SURVEYURL}/summary/all`))
    .data;
  return allSurveysSummary;
}

export const getSurveysList = () =>
  axiosClient({
    url: `/survey`,
    method: "GET",
  });
// ----------get all survey landings-------------
export async function getSurveyLandings() {
  try {
    const surveyLandings: Array<SurveyLanding> = (
      await axiosClient.get(`${SURVEYURL}/surveylandings`)
    ).data;
    return surveyLandings;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}
export async function _getSurveysLandingPage() {
  try {
    const surveys: Array<Survey> = (await axiosClient.get(`${SURVEYURL}/createlanding`)).data;
    return surveys;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}
// ----get whatsapp survey list ------------
export async function getWhatsappSurveys() {
  const surveys: Array<Survey> = (await axiosClient.get(`${SURVEYURL}/whatsappsurveys`)).data;
  return surveys;
}

export async function getSurvey(surveyId: string) {
  if (!surveyId) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/${surveyId}`);
  return res.data as Survey;
}

export async function getLandingpage(LandingId: string) {
  if (!LandingId) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/landingpage/${LandingId}`);
  return res.data as Survey;
}

export async function getSurveyByLandingId(landingid: string) {
  if (!landingid) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/landingsurveys/${landingid}`);
  return res.data as Survey;
}

type ExtendedSurvey = Survey & {
  googleLink: string;
  reviews: Array<any>;
  webSurveyThemeId: string;
  webSurveyTheme: any;
  message?: string;
};

export async function getPublicSurvey(surveyId: string, ip?: string) {
  const config: {
    headers?: Record<string, string>;
    params: { checkUniqueDevice: boolean };
  } = {
    params: {
      checkUniqueDevice: !!ip,
    },
  };

  // Avoid sending custom headers from browser requests when IP is unavailable.
  if (ip?.trim()) {
    config.headers = {
      "x-forwarded-for": ip,
    };
  }

  const res = await axiosClientIP.get(`${SURVEY_PUBLIC_URL}/${surveyId}`, config);
  return res.data as ExtendedSurvey;
}

export async function getPublicSurveyGoogleLink(surveyTeamMapId: string) {
  const res = await axiosClientIP.get(`${SURVEY_PUBLIC_URL}/googlelink/${surveyTeamMapId}`);
  return res.data as string;
}

export async function getPhoneNumberFromSurveyTeamMapId(surveyTeamMapId: string) {
  const res = await axiosClientIP.get(`${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/phone`);
  return res.data as { phone: string };
}

export async function deleteSurvey(surveyId: string) {
  return await axiosClient.delete(`${SURVEYURL}/${surveyId}`);
}

// remove a team from survey
export async function deleteSurveyForOneTeam(surveyId: string, teamId: string) {
  const data = {
    teamId: teamId,
  };

  return await axiosClient.delete(`${SURVEYURL}/teamsurvey/${surveyId}`, {
    data,
  });
}

export async function updateSurvey(surveyId: string, data: RequestPayload) {
  return await axiosClient.put(`${SURVEYURL}/${surveyId}`, data);
}

export async function updateSurveyGoogleLink(surveyTeamMapId: string, data: RequestPayload) {
  return await axiosClient.put(`${SURVEYURL}/googlelink-update/${surveyTeamMapId}`, data);
}

export async function updateSurveyPassword({
  surveyId,
  password,
}: {
  surveyId: string;
  password: string;
}) {
  const data = { password: password };
  return await axiosClient.put(`${SURVEYURL}/password-update/${surveyId}`, data);
}

export async function verifySurveyPassword(surveyId: string, data: RequestPayload) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/check-password/${surveyId}`, data);
}

export async function updateSurveyVisited(surveyTeamMapId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/visited`);
}

export async function updateSurveyStarted(surveyTeamMapId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/started`);
}

export async function updateSurveyCompleted(surveyTeamMapId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/completed`);
}

export async function updateReviewLinkStatsOnSurvey(surveyTeamMapId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/review/visited`);
}

export async function getSurveyStatsBySurveyTeamMapId(surveyTeamMapId: string) {
  const res = await axiosClient.get(`${SURVEYURL}/surveyStats/${surveyTeamMapId}`);
  return res.data as STStats;
}

export async function getSurveyStats(surveyId: string) {
  return (await axiosClient.get(`${SURVEYURL}/surveyStats/all/${surveyId}`)).data;
}

export async function getSurveyVariables(surveyId: string, isPublic?: boolean) {
  return (
    await axiosClient.get(
      `${isPublic ? SURVEY_PUBLIC_URL : SURVEYURL}/survey-variables/${surveyId}`,
    )
  ).data as Array<SurveyVariable>;
}

export async function createSurveyVariable({
  surveyId,
  data,
}: {
  surveyId: string;
  data: RequestPayload;
}) {
  return (await axiosClient.post(`${SURVEYURL}/survey-variables/${surveyId}`, data)).data;
}

export async function updateSurveyVariable({
  variableId,
  data,
}: {
  variableId: string;
  data: RequestPayload;
}) {
  return (await axiosClient.put(`${SURVEYURL}/survey-variables/${variableId}`, data)).data;
}

export async function deleteSurveyVariable({ variableId }: { variableId: string }) {
  return (await axiosClient.delete(`${SURVEYURL}/survey-variables/${variableId}`)).data;
}

export async function sendEmail(data: RequestPayload) {
  return (await axiosClient.post(`email/send-email`, data)).data;
}

export async function sendOTPEmail(data: RequestPayload) {
  return (await axiosClient.post(`email/otp/send-email`, data)).data;
}

export async function validateOTP(data: RequestPayload) {
  return (await axiosClient.post(`email/otp/validate`, data)).data;
}

export async function getSurveyResponseForGraph(
  timePeriod: string,
  userTimeZone: string,
  surveyId: string,
  teamMapIds: string[],
) {
  return (
    await axiosClient.get(
      `${SURVEYURL}/summary/response?timePeriod=${timePeriod}&userTimeZone=${userTimeZone}&surveyId=${surveyId}&teamMapIds=${teamMapIds}`,
    )
  ).data;
}

export async function getNPSSurveyResponseForGraph(
  timePeriod: string,
  userTimeZone: string,
  surveyId: string,
  teamMapIds: string[],
) {
  return (
    await axiosClient.get(
      `${SURVEYURL}/summary/response/nps?timePeriod=${timePeriod}&userTimeZone=${userTimeZone}&surveyId=${surveyId}&teamMapIds=${teamMapIds}`,
    )
  ).data;
}
