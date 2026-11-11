import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../../apiClient";

const questionsUrl = (surveyId: string) => `/surveys/${surveyId}/questions`;

// TODO: somehow import types from backend?
export async function createQuestion(surveyId: string, data: RequestPayload) {
  return axiosClient.post(questionsUrl(surveyId), data);
}

export async function getQuestions(surveyId: string) {
  if (!surveyId) return [];
  const res = await axiosClient.get(questionsUrl(surveyId));
  return res.data as Question[];
}

export async function deleteQuestion(surveyId: string, questionId: string) {
  return axiosClient.delete(`${questionsUrl(surveyId)}/${questionId}`);
}

export async function reorderQuestions(surveyId: string, newOrder: string[]) {
  return axiosClient.put(`${questionsUrl(surveyId)}/reorder`, newOrder);
}
export async function replaceQuestions(surveyId: string, questions: Question[], screenId?: string) {
  return axiosClient.put(`${questionsUrl(surveyId)}/replace`, {
    questions,
    screenId,
  });
}
export async function updateQuestion(
  surveyId: string,
  questionId: string,
  data: Partial<Question>,
) {
  return axiosClient.put(`${questionsUrl(surveyId)}/${questionId}`, data);
}

export async function importEmailIds({
  surveyId,
  questionId,
  data,
}: {
  surveyId: string;
  questionId: string;
  data: RequestPayload;
}) {
  return (await axiosClient.post(`${questionsUrl(surveyId)}/import-emails/${questionId}`, data))
    .data;
}
