import axios from "@/src/config/axios";

const QUESTION_URL = "/api/question";

export async function getQuestions(surveyId: string) {
  if (!surveyId) return [];
  const res = await axios.get(`${QUESTION_URL}/${surveyId}`);
  return res.data;
}