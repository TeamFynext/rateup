import { WHATSAPP_URL } from "..";
import { WaFlowJson, WaFlowWa } from "../../../types/global";
import { axiosClient } from "../../apiClient";

const BASE = `${WHATSAPP_URL}/flows`;

export async function getWaFlowsFromDb() {
  const res = await axiosClient.get(`${BASE}?source=db`);
  return res.data;
}
export async function getWaFlowsFromWa() {
  const res = await axiosClient.get(`${BASE}?source=wa`);
  return res.data;
}
export async function getWaFlowFromDb(flowId: string) {
  const res = await axiosClient.get(`${BASE}/${flowId}`);
  return res.data as DbFlow;
}
export async function getUnsyncedFlows() {
  const res = await axiosClient.get(`${BASE}/unsynced`);
  return res.data as WaFlowWa[];
}
export async function getWaFlowJson(flowId: string) {
  const res = await axiosClient.get(`${BASE}/${flowId}/json`);
  return res.data as WaFlowJson;
}

export async function importFlows(
  waFlowIds: string[],
  teamIds: string[],
  mapData: object,
) {
  const res = await axiosClient.post(`${BASE}/import`, {
    waFlowIds,
    teamIds,
    mapData,
  });
  return res.data;
}
export async function cloneFlows(flowId: string) {
  const res = await axiosClient.put(`${BASE}/clone/${flowId}`, {});
  return res.data;
}
export type createFlowInput = {
  name: string;
  teamIds: string[];
  categories: string[];
};
export async function createFlow(data: createFlowInput) {
  await axiosClient.post(`${BASE}`, data);
}
export async function updateFlow(
  dbFlowId: string,
  data: Partial<Omit<DbFlow, "id">>,
) {
  try {
    return (await axiosClient.put(`${BASE}/${dbFlowId}`, data))?.data;
  } catch (error) {
    return error?.response?.data;
  }
}

export async function getFlowPreview(dbFlowId: string) {
  const res = await axiosClient.get(`${BASE}/${dbFlowId}/preview`);
  return res.data;
}

export async function deleteFlow(dbFlowId: string) {
  await axiosClient.delete(`${BASE}/${dbFlowId}`);
}
export async function deprecateFlow(dbFlowId: string) {
  await axiosClient.put(`${BASE}/${dbFlowId}/deprecate`);
}
export async function publishFlow(dbFlowId: string) {
  await axiosClient.put(`${BASE}/${dbFlowId}/publish`);
}
