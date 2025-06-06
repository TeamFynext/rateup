import { WHATSAPP_URL } from "..";
import { WaConfigType } from "../../../types/enums";
import { axiosClient } from "../../apiClient";

const SettingsUrl = `${WHATSAPP_URL}/settings`;
const authUrl = `${WHATSAPP_URL}/auth`;

type WaSettings = {
  wabaId: string;
  phone: string;
  phoneId: string;
  accessToken: string;
  webhookPassword: string;
  appId: string;
  type: WaConfigType;
}[];
export const getWaSettings = async () => {
  const res = await axiosClient.get(SettingsUrl);
  return res.data as WaSettings;
};

export const upsertWaSettings = async (settings) => {
  const res = await axiosClient.put(SettingsUrl, settings);
  return res;
};

export const createWaSettings = async (settings) => {
  const res = await axiosClient.post(SettingsUrl, settings);
  return res.data;
};
export const deleteWaSettings = async () => {
  const res = await axiosClient.delete(SettingsUrl);
  return res.data;
};

export const registerBusinessClient = async ({
  code,
  phone_number_id,
  waba_id,
}) => {
  const res = axiosClient.post(
    `${authUrl}/register`,
    { code, phone_number_id, waba_id },
    {
      timeout: 1000 * 25,
    },
  );
  return res;
};

export const deRegisterBusinessClient = async (phoneId: string) => {
  const res = axiosClient.post(`${authUrl}/deregister/${phoneId}`);
  return res;
};

export async function updateContactTags(tags) {
  return await axiosClient.post(`${SettingsUrl}/contact_tag`, tags);
}
type getContactTagsRes = {
  contactTags: string[];
};
export async function getContactTags() {
  return (await axiosClient.get(`${SettingsUrl}/contact_tag`))
    ?.data as getContactTagsRes;
}
type WaLogsRes = {
  logs: {
    id: string;
    createdAt: string;
    logs?: {
      code?: number;
      title?: string;
      message?: string;
      error_data?: {
        details?: string;
      };
    }[];
  };
  totalCount: number;
};
export const getWaLogs = async (
  pagination: {
    pageIndex: number;
    pageSize: number;
  },
  search: string,
  sort: {
    id: string;
    desc: string;
  },
  columnFilters: { id: string; value: string }[],
) => {
  let filter = columnFilters
    .map((data) => `&${data.id}=${data.value}`)
    .join("&");
  let desc = sort.desc ? "desc" : "asc";
  const url = `${SettingsUrl}/logs?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&desc=${desc}${filter}`;

  const res = await axiosClient.get(url);
  return res.data as WaLogsRes;
};
