import axios from "@/src/config/axios";

const RESPONSE_URL = "/api/response";
export async function getSurveyResponseAnalyics(surveyId, filter = "") {
  return (
    await axios.get(`${RESPONSE_URL}/analytics/${surveyId}?${filter}`)
  ).data;
}

export async function getResponses(surveyTeamMapId: string) {
  const res = await axios.get(`${RESPONSE_URL}/${surveyTeamMapId}`);
  return res.data as Array<any>;
}

export async function getResponsesBySurveyId(
  surveyId: string,
  filter: string = "",
) {
  const res = await axios.get(
    `${RESPONSE_URL}/survey/${surveyId}?${filter}`,
  );
  return res.data;
}