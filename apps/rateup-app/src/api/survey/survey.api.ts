import axios from "@/src/config/axios";

const SURVEYURL = "/api/survey";

export async function getSurveys() {
  try {
    let surveys: Array<any> = (await axios.get(SURVEYURL)).data;
    return surveys;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}
