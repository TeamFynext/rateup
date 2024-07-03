import { axiosClient } from "../../apiClient";
import { saveAs } from "file-saver";

const RESPONSE_URL = "/response";

export async function getResponses(surveyTeamMapId: string) {
  const res = await axiosClient.get(`${RESPONSE_URL}/${surveyTeamMapId}`);
  return res.data as Array<SurveyResponse>;
}

export interface TeamWiseResponses {
  id: string; // teamId
  responses?: Array<SurveyResponse>;
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

type CreateResponseType = Omit<SurveyResponse, "id" | "createdAt"> & {
  shouldRaiseTicket?: boolean;
  checkUniqueDevice?: boolean;
};
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
type generateResponseType = {
  surveyTeamMapId: string;
  batchSize: number;
};
export async function generateResponse(data: generateResponseType) {
  return (await axiosClient.post(`${RESPONSE_URL}/generate`, data))?.data;
}

export async function syncResponseToGoogleSheet({ surveyId }) {
  let res = await axiosClient.post(
    `${RESPONSE_URL}/${surveyId}/sync-response`,
    {},
    { timeout: 0 },
  );
  return res?.data;
}

export type downloadExcelResponseType = {
  surveyId: string;
  defaultLanguage: string;
  visibleColumn: string[];
  title: string;
  tz: string;
  filterTeams: string[];
  campaignIds: string[];
};

export async function downloadExcelResponse(data: downloadExcelResponseType) {
  const response = await axiosClient.post(
    `${RESPONSE_URL}/download-response`,
    data,
    {
      responseType: "blob",
    },
  );
  const blob = new Blob([response.data], {
    type: response.headers["content-type"],
  });

  return saveAs(blob, `${data.title}.xlsx`);
}
