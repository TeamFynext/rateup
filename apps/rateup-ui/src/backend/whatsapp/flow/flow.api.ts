import type { CreateAxiosDefaults } from "axios";
import { toast } from "sonner";

import type { WaFlowJson, WaFlowWa } from "@/types/global";
import { getApiErrorData } from "@/utils/apiError.ts";

import { WHATSAPP_URL } from "..";
import { axiosClient as ac } from "../../apiClient";

const axiosInstanceConfig: CreateAxiosDefaults = {
  timeout: 15000,
};
// cloning axios instance with default config
const axiosClient = ac.create(axiosInstanceConfig);

axiosClient.interceptors.response.use(undefined, (error) => {
  if (error.code === "ECONNABORTED") {
    toast.error("Request Timed Out");
  }
  return Promise.reject(error);
});

const BASE = `${WHATSAPP_URL}/flows`;

/**
 * @param whatsappSettingsPhoneId only flows that live on this number's WABA. Flow ids
 *   are scoped to a WABA at Meta, so anything that will use a flow on one number —
 *   a template's FLOW button, say — has to ask for that number's flows.
 */
export async function getWaFlowsFromDb(whatsappSettingsPhoneId?: string) {
  const res = await axiosClient.get(`${BASE}?source=db`, {
    params: whatsappSettingsPhoneId ? { whatsappSettingsPhoneId } : undefined,
  });
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

export async function importFlows(waFlowIds: string[], teamIds: string[], mapData: object) {
  const res = await axiosClient.post(`${BASE}/import`, {
    waFlowIds,
    teamIds,
    mapData,
  });
  return res.data;
}
export async function cloneAndDeprecateFlows(flowId: string) {
  const res = await axiosClient.put(`${BASE}/clone-and-deprecate/${flowId}`, {});
  return res.data;
}

export interface cloneFlowsProps {
  flowId: string;
  teamId: string;
}
export async function cloneFlows({ flowId, teamId }: cloneFlowsProps) {
  const res = await axiosClient.put(`${BASE}/clone/${flowId}`, {
    teamId: teamId,
  });
  return res.data;
}
export interface createFlowInput {
  name: string;
  teamIds: string[];
  /** Meta's categories and RateUp's own LOYALTY_FEEDBACK; stored as given, mapped for Meta. */
  categories: string[];
  /** A ready-made flow (see getFlowTemplates) to start from. */
  templateKey?: string;
  /** Number to create the flow on; the org's default channel when omitted. */
  whatsappSettingsPhoneId?: string;
}
export async function createFlow(data: createFlowInput) {
  return (await axiosClient.post(`${BASE}`, data))?.data;
}

export interface FlowTemplate {
  key: string;
  label: string;
  description: string;
  questions: Array<{ title: string; kind: "rating" | "text" }>;
  /** v2 WaFlow JSON, renderable by the flow preview without the editor store. */
  previewJson: WaFlowJson;
}
export interface FlowTemplatesResponse {
  templates: FlowTemplate[];
  /** The one to preselect for this org, when the category has a sensible guess. */
  suggestedKey: string | null;
}
/** Ready-made flows for a category — what the create-flow wizard offers. */
export async function getFlowTemplates(category: string): Promise<FlowTemplatesResponse> {
  const res = await axiosClient.get(`${BASE}/templates`, { params: { category } });
  return res.data;
}
export async function updateFlow(dbFlowId: string, data: Partial<Omit<DbFlow, "id">>) {
  try {
    toast.loading(`Hold on, flow is getting Updated...`, {
      id: "flow-update",
    });
    return (await axiosClient.put(`${BASE}/${dbFlowId}`, data))?.data;
  } catch (error) {
    return getApiErrorData(error);
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
    toast.loading(`Hold on, flow is getting Updated...`, {
      id: "flow-meta-data-update",
    });
    return (await axiosClient.put(`${BASE}/update-flow-metadata/${dbFlowId}`, data))?.data;
  } catch (error) {
    console.log(error, "error");
    return getApiErrorData(error);
  }
}

export async function pushFlowJsonToWa(dbFlowId: string) {
  return await axiosClient.put(`${BASE}/${dbFlowId}/push-to-wa`);
}
