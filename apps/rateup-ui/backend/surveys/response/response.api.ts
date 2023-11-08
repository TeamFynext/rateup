import { axiosClient } from "../../apiClient";

const RESPONSE_URL = "/response";

export async function getResponses(surveyId: string) {
  const res = await axiosClient.get(`${RESPONSE_URL}/${surveyId}`);
  return res.data as Array<SurveyResponse>;
}

type CreateResponseType = Omit<SurveyResponse, "id" | "createdAt">;
export async function createResponsePublic(data: CreateResponseType) {
  return await axiosClient.post(`/public/response`, data);
}

export async function resetResponsesStats(surveyId: string) {
  const res = await axiosClient.delete(`${RESPONSE_URL}/reset/${surveyId}`);
  return res.data;
}

export async function deleteResponse(id: string, surveyId: string) {
  const res = await axiosClient.delete(
    `${RESPONSE_URL}/${surveyId}/delete/${id}`,
  );
  return res.data;
}
