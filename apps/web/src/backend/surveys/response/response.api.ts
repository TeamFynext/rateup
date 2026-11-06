import type { RequestPayload } from "@/types/api.ts";
import { downloadBlob } from "@/utils/downloadBlob.ts";

import { axiosClient } from "../../apiClient";

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

export async function getResponsesBySurveyId(surveyId: string, filter: string = "") {
  const res = await axiosClient.get(`${RESPONSE_URL}/survey/${surveyId}?${filter}`);
  return res.data;
}

type CreateResponseType = Omit<SurveyResponse, "id" | "createdAt"> & {
  checkUniqueDevice?: boolean;
  selectedColumnId?: string;
};
export async function createResponsePublic(data: CreateResponseType) {
  return await axiosClient.post(`/public/response`, data);
}

export async function resetResponsesStats(surveyTeamMapId: string) {
  const res = await axiosClient.delete(`${RESPONSE_URL}/reset/${surveyTeamMapId}`);
  return res.data;
}

export async function deleteResponse(id: string, surveyTeamMapId: string) {
  const res = await axiosClient.delete(`${RESPONSE_URL}/${surveyTeamMapId}/delete/${id}`);
  return res.data;
}
interface generateResponseType {
  surveyTeamMapId: string;
  batchSize: number;
}
export async function generateResponse(data: generateResponseType) {
  return (await axiosClient.post(`${RESPONSE_URL}/generate`, data))?.data;
}

export async function syncResponseToGoogleSheet({ surveyId }: { surveyId: string }) {
  const res = await axiosClient.post(
    `${RESPONSE_URL}/${surveyId}/sync-response`,
    {},
    { timeout: 0 },
  );
  return res?.data;
}

export interface downloadExcelResponseType {
  surveyId: string;
  defaultLanguage: string;
  visibleColumn: string[];
  title: string;
  tz: string;
  filterTeams: string[];
  campaignIds: string[];
  dbFlowId?: string;
  format?: "xlsx" | "ods";
  columnFilters?: { id: string; value: unknown }[];
  ranges?: {
    startDate?: Date;
    endDate?: Date;
    key?: string;
  };
}

export async function downloadExcelResponse(data: downloadExcelResponseType) {
  const response = await axiosClient.post(`${RESPONSE_URL}/download-response`, data, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], {
    type: response.headers["content-type"] as string,
  });

  return downloadBlob(blob, `${data.title}.${data.format || "xlsx"}`);
}

export async function getLargeTextResponseSummaryByAI({
  surveyId,
  data,
}: {
  surveyId: string;
  data: RequestPayload;
}) {
  return (
    await axiosClient.post(`${RESPONSE_URL}/summarize/${surveyId}`, data, {
      timeout: 60000,
    })
  ).data;
}

export async function exportContactResponseToContacts(surveyId: string) {
  return await axiosClient.post(`${RESPONSE_URL}/export-contacts/${surveyId}`);
}

export async function getSurveyResponseCount(surveyId: string) {
  return (await axiosClient.get(`${RESPONSE_URL}/count/${surveyId}`)).data;
}

interface ResponseAnalytic {
  nps: {
    [questionId: string]: {
      csatScore: number;
      npsData: {
        npsScore: number;
        passives: number;
        detractors: number;
        promoters: number;
        total: number;
      };
      responseCount: number;
    };
  };
  choiceWise: {
    [questionId: string]: {
      data: { choice: string; count: number }[];
      subData?: {
        [question: string]: { choice: string; count: number }[];
      };
      responseCount: number;
    };
  };
}
export async function getSurveyResponseAnalytics(surveyId: string, filter = "") {
  return (await axiosClient.get(`${RESPONSE_URL}/analytics/${surveyId}?${filter}`))
    .data as ResponseAnalytic;
}

export async function getResponseForComparison(surveyId: string) {
  return (await axiosClient.get(`${RESPONSE_URL}/comparison/${surveyId}`)).data;
}

export async function getSurveyHappyResponseAnalytics(surveyId: string, timeFilter = "") {
  return (await axiosClient.get(`${RESPONSE_URL}/npsanalytics/${surveyId}?${timeFilter}`)).data;
}

export async function getHappyIndex(surveyId: string, surveyTeamMapIds?: string[]) {
  return (
    await axiosClient.get(
      `${RESPONSE_URL}/analytics/happyindex/${surveyId}?teamMapIds=${surveyTeamMapIds?.join(",")}`,
    )
  ).data;
}
