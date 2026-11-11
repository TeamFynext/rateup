import axios from "@/config/axios";
import type { SurveyQuestion } from "./types";

const SURVEYS_URL = "/api/surveys";

export async function getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  if (!surveyId) return [];
  const res = await axios.get<SurveyQuestion[]>(`${SURVEYS_URL}/${surveyId}/questions`);
  return res.data;
}

export async function getQuestionById(surveyId: string, qId: string) {
  const res = await axios.get(`${SURVEYS_URL}/${surveyId}/questions/${qId}`);
  return res.data;
}
