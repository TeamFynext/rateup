import axios from "@/config/axios";
import { logger } from "@/utils/logger";

const SURVEYURL = "/api/surveys";

export async function getSurveys() {
  try {
    let surveys: Array<any> = (await axios.get(SURVEYURL)).data;
    return surveys;
  } catch (e) {
    logger.error(e);
    return { error: "Error Occured!" };
  }
}

export async function getSurvey(surveyId: string) {
  if (!surveyId) return undefined;
  const res = await axios.get(`${SURVEYURL}/${surveyId}`);
  return res.data;
}

export async function getSurveyStats(surveyId: string) {
  return (await axios.get(`${SURVEYURL}/surveyStats/all/${surveyId}`)).data;
}
