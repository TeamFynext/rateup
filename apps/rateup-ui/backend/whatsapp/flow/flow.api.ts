import { notifications } from "@mantine/notifications";
import { CreateAxiosDefaults } from "axios";

import { WHATSAPP_URL } from "..";
import { WaFlowJson, WaFlowWa } from "../../../types/global";
import { showErrorToast } from "../../../utils/notifications";
import { axiosClient as ac } from "../../apiClient";

const axiosInstanceConfig: CreateAxiosDefaults = {
  timeout: 15000,
};
// cloning axios instance with default config
// @ts-ignore  (Ignoring known error https://github.com/axios/axios/issues/5095)
const axiosClient = ac.create(axiosInstanceConfig);

axiosClient.interceptors.response.use(undefined, (error) => {
  if (error.code === "ECONNABORTED") {
    showErrorToast("Request Timed Out");
  }
  return Promise.reject(error);
});

const BASE = `${WHATSAPP_URL}/flows`;

export async function getWaFlowsFromDb() {
  const res = await axiosClient.get(`${BASE}?source=db`);
  return res.data as DbFlow[];
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
export async function getWaFlowMetrics(flowId: string) {
  const res = await axiosClient.get(`${BASE}/metrics/${flowId}`);
  return res.data;
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
export async function cloneAndDeprecateFlows(flowId: string) {
  const res = await axiosClient.put(
    `${BASE}/clone-and-deprecate/${flowId}`,
    {},
  );
  return res.data;
}

export type cloneFlowsProps = {
  flowId: string;
  teamId: string;
};
export async function cloneFlows({ flowId, teamId }: cloneFlowsProps) {
  const res = await axiosClient.put(`${BASE}/clone/${flowId}`, {
    teamId: teamId,
  });
  return res.data;
}
export type createFlowInput = {
  name: string;
  teamIds: string[];
  categories: string[];
};
export async function createFlow(data: createFlowInput) {
  try {
    return (await axiosClient.post(`${BASE}`, data))?.data;
  } catch (error) {
    throw Error(error?.response?.data);
  }
}
export async function updateFlow(
  dbFlowId: string,
  data: Partial<Omit<DbFlow, "id">>,
) {
  try {
    notifications.show({
      id: "flow-update",
      loading: true,
      title: "Updating Flow",
      message: `Hold on, flow is getting Updated...`,
      autoClose: false,
      withCloseButton: false,
    });
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
  await axiosClient.post(`${BASE}/${dbFlowId}/deprecate`);
}
export async function publishFlow(dbFlowId: string) {
  await axiosClient.put(`${BASE}/${dbFlowId}/publish`);
}

export async function sendFlow(
  dbFlowId: string,
  phone: string,
  teamId: string,
  flowId: string,
  whatsappSettingsPhoneId: string,
) {
  await axiosClient.post(`${BASE}/${dbFlowId}/send`, {
    phone,
    teamId,
    flowId,
    whatsappSettingsPhoneId,
  });
}

export async function updateFlowMetaData(
  dbFlowId: string,
  data: { name: string; anonymous: boolean },
) {
  try {
    notifications.show({
      id: "flow-meta-data-update",
      loading: true,
      title: "Updating Flow",
      message: `Hold on, flow is getting Updated...`,
      autoClose: false,
      withCloseButton: false,
    });
    return (
      await axiosClient.put(`${BASE}/update-flow-metadata/${dbFlowId}`, data)
    )?.data;
  } catch (error) {
    console.log(error, "error");
    return error?.response?.data;
  }
}

export async function pushFlowJsonToWa(dbFlowId: string) {
  return await axiosClient.put(`${BASE}/${dbFlowId}/push-to-wa`);
}
