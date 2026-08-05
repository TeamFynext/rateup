import axios from "@/config/axios";
import type { SurveyResponseAnalytics } from "./types";

const RESPONSE_URL = "/api/response";
const SURVEYURL = "/api/survey";
export async function getSurveyResponseAnalyics(
  surveyId: string,
  filter = "",
): Promise<SurveyResponseAnalytics> {
  return (
    await axios.get<SurveyResponseAnalytics>(`${RESPONSE_URL}/analytics/${surveyId}?${filter}`)
  ).data;
}

export async function getResponses(surveyTeamMapId: string) {
  const res = await axios.get(`${RESPONSE_URL}/${surveyTeamMapId}`);
  return res.data as Array<any>;
}

export async function getResponsesBySurveyId(surveyId: string, filter: string = "") {
  const res = await axios.get(`${RESPONSE_URL}/survey/${surveyId}?${filter}`);
  return res.data;
}

export async function getSurveyResponseCount(surveyId: string) {
  return (await axios.get(`${RESPONSE_URL}/count/${surveyId}`)).data;
}

export async function getHappyIndex(surveyId: string) {
  return (await axios.get(`${RESPONSE_URL}/analytics/happyindex/${surveyId}`)).data;
}

/** Time bucketing supported by `GET /api/survey/summary/response/nps`. */
export type NpsGraphTimePeriod = "hourly" | "daily" | "weekly";

export async function getNPSSurveyResponseForGraph(
  timePeriod: NpsGraphTimePeriod,
  userTimeZone: string,
  surveyId: string,
  teamMapIds: string[],
) {
  return (
    await axios.get(
      `${SURVEYURL}/summary/response/nps?timePeriod=${timePeriod}&userTimeZone=${userTimeZone}&surveyId=${surveyId}&teamMapIds=${teamMapIds}`,
    )
  ).data;
}
