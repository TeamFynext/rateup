import axios from "@/src/config/axios";
import { DbFlow } from "../types";

const BASE = `/api/wa/flows`;
const RESPONSE_URL = "/api/response";
const SURVEYURL = "/api/survey";

export async function getWaFlowsFromDb() {
  const res = await axios.get(`${BASE}?source=db`);
  return res.data as DbFlow[];
}

export async function getWaFlowFromDb(flowId: string) {
  const res = await axios.get(`${BASE}/${flowId}`);
  return res.data as DbFlow;
}

export async function getResponses(surveyTeamMapId: string) {
  const res = await axios.get(`${RESPONSE_URL}/${surveyTeamMapId}`);
  return res.data as Array<any>;
}

export async function getResponsesBySurveyId(
  surveyId: string,
  filter: string = "",
) {
  const res = await axios.get(
    `${RESPONSE_URL}/survey/${surveyId}?${filter}`,
  );
  return res.data;
}