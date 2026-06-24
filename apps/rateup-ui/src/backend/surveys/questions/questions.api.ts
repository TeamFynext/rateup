import { axiosClient } from "../../apiClient";

const QUESTION_URL = "/question";

// TODO: somehow import types from backend?
export async function createQuestion(surveyId: string, data) {
  return axiosClient.post(`${QUESTION_URL}/${surveyId}`, data);
}

export async function getQuestions(surveyId: string) {
  if (!surveyId) return [];
  const res = await axiosClient.get(`${QUESTION_URL}/${surveyId}`);
  return res.data as Question[];
}

export async function deleteQuestion(surveyId: string, questionId: string) {
  return axiosClient.delete(`${QUESTION_URL}/${surveyId}/${questionId}`);
}

export async function reorderQuestions(surveyId: string, newOrder: string[]) {
  return axiosClient.put(`${QUESTION_URL}/${surveyId}/reorder`, newOrder);
}
export async function replaceQuestions(surveyId: string, questions: Question[], screenId?: string) {
  return axiosClient.put(`${QUESTION_URL}/${surveyId}/replace`, {
    questions,
    screenId,
  });
}
export async function updateQuestion(
  surveyId: string,
  questionId: string,
  data: Partial<Question>,
) {
  return axiosClient.put(`${QUESTION_URL}/${surveyId}/${questionId}`, data);
}

export async function importEmailIds({ surveyId, questionId, data }) {
  return (await axiosClient.post(`${QUESTION_URL}/${surveyId}/import-emails/${questionId}`, data))
    .data;
}
