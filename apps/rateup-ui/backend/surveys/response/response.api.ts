import { axiosClient } from "../../apiClient";

const RESPONSE_URL = "/response";

export async function getResponses(surveyTeamMapId: string) {
  const res = await axiosClient.get(`${RESPONSE_URL}/${surveyTeamMapId}`);
  return res.data as Array<SurveyResponse>;
}

export interface TeamWiseResponses {
  id: string; // teamId
  responses: Array<SurveyResponse>;
  team: {
    // TODO: create Team in global.d.ts
    id: string;
    name: string;
    code: string;
  };
  _count: {
    responses: number;
  };
}

export async function getAllResponses(surveyId: string) {
  const res = await axiosClient.get(`${RESPONSE_URL}/all/${surveyId}`);
  return res.data as Array<TeamWiseResponses>;
}

type CreateResponseType = Omit<SurveyResponse, "id" | "createdAt">;
export async function createResponsePublic(data: CreateResponseType) {
  return await axiosClient.post(`/public/response`, data);
}

export async function resetResponsesStats(surveyTeamMapId: string) {
  const res = await axiosClient.delete(
    `${RESPONSE_URL}/reset/${surveyTeamMapId}`,
  );
  return res.data;
}

export async function deleteResponse(id: string, surveyTeamMapId: string) {
  const res = await axiosClient.delete(
    `${RESPONSE_URL}/${surveyTeamMapId}/delete/${id}`,
  );
  return res.data;
}
