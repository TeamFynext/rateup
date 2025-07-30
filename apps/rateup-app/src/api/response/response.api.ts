import axios from "@/src/config/axios";

const RESPONSE_URL = "/api/response";
const SURVEYURL = "/api/survey";
export async function getSurveyResponseAnalyics(surveyId: string, filter = "") {
  return (await axios.get(`${RESPONSE_URL}/analytics/${surveyId}?${filter}`))
    .data;
}

export async function getResponses(surveyTeamMapId: string) {
  const res = await axios.get(`${RESPONSE_URL}/${surveyTeamMapId}`);
  return res.data as Array<any>;
}

export async function getResponsesBySurveyId(
  surveyId: string,
  filter: string = ""
) {
  const res = await axios.get(`${RESPONSE_URL}/survey/${surveyId}?${filter}`);
  return res.data;
}

export async function getSurveyResponseCount(surveyId: string) {
  return (await axios.get(`${RESPONSE_URL}/count/${surveyId}`)).data;
}

export async function getHappyIndex(surveyId: string) {
  return (await axios.get(`${RESPONSE_URL}/analytics/happyindex/${surveyId}`))
    .data;
}

export async function getNPSSurveyResponseForGraph(
  timePeriod,
  userTimeZone,
  surveyId,
  teamMapIds
) {
  return (
    await axios.get(
      `${SURVEYURL}/summary/response/nps?timePeriod=${timePeriod}&userTimeZone=${userTimeZone}&surveyId=${surveyId}&teamMapIds=${teamMapIds}`
    )
  ).data;
}
