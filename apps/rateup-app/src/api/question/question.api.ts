import axios from "@/config/axios";
import type { SurveyQuestion } from "./types";

const QUESTION_URL = "/api/question";

export async function getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  if (!surveyId) return [];
  const res = await axios.get<SurveyQuestion[]>(`${QUESTION_URL}/${surveyId}`);
  return res.data;
}

export async function getQuestionById(surveyId: string, qId: string) {
  const res = await axios.get(`${QUESTION_URL}/${surveyId}/${qId}`);
  return res.data;
}
