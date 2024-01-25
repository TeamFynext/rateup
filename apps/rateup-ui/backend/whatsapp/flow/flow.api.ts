import { WHATSAPP_URL } from "..";
import { WaFlowJson } from "../../../types/global";
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
  return res.data;
}
export async function getUnsyncedFlows() {
  const res = await axiosClient.get(`${BASE}/unsynced`);
  return res.data;
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
