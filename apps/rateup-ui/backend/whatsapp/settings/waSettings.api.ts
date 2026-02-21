import { WHATSAPP_URL } from "..";
import {
  MetaLoginAssets,
  WaConfigType,
  WhatsappSettingsStatus,
} from "../../../types/enums";
import { axiosClient } from "../../apiClient";
import { GetLabelsRes } from "../../lifecycle/lifecycle.types";

const SettingsUrl = `${WHATSAPP_URL}/settings`;
const authUrl = `${WHATSAPP_URL}/auth`;

export type WaSettings = {
  id: string;
  wabaId: string;
  phone: string;
  phoneId: string;
  accessToken: string;
  webhookPassword: string;
  appId: string;
  type: WaConfigType;
  fbPageId: string;
  ibaId: string;
  pageAccessToken: string;
  igUserName: string;
  phoneDisplayName: string;
  igDisplayName: string;
  assets: MetaLoginAssets[];
  paymentMethod?: string;
  teams: { id: string; name: string }[];
  status?: WhatsappSettingsStatus;
}[];

export type UpdateWaSettingsInput = Partial<
  Omit<WaSettings[0], "teams"> & { teams: string[] }
>;

export const getWaSettings = async () => {
  const res = await axiosClient.get(SettingsUrl);
  return res.data as WaSettings;
};

export const upsertWaSettings = async (settings) => {
  const res = await axiosClient.put(SettingsUrl, settings);
  return res;
};

export const updateWaSettingsById = async (settingId, data) => {
  const res = await axiosClient.put(`${SettingsUrl}/${settingId}`, data);
  return res;
};

export const createWaSettings = async (settings) => {
  const res = await axiosClient.post(SettingsUrl, settings);
  return res.data;
};
export const deleteWaSettings = async (phoneId) => {
  const res = await axiosClient.delete(`${SettingsUrl}/${phoneId}`);
  return res.data;
};

export const registerBusinessClient = async ({
  code,
  phone_number_id,
  waba_id,
  assets,
}) => {
  const res = axiosClient.post(
    `${authUrl}/register`,
    { code, phone_number_id, waba_id, assets },
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

export const updateUserAccessToken = async ({ waSettingId, code }) => {
  const res = axiosClient.post(`${authUrl}/user-token/${waSettingId}`, {
    code,
  });
  return res;
};

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

export const syncFbPages = async (waSettingsId) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/pages/${waSettingsId}`,
  );
  return res.data as { id: string; name: string; access_token: string }[];
};

export interface fbPageQuery {
  fbPageId: string;
  pageAccessToken: string;
  fields?: string[];
}

export const syncMetaLeadgenForms = async (waSettingsId, data: fbPageQuery) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/leadgen-forms/${waSettingsId}`,
    data,
  );
  return res.data as { id: string; name: string }[];
};
export const syncLeadgenFormQuestions = async (
  formId: string,
  waSettingsId: string,
  data: fbPageQuery,
) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/leadgen-form/${formId}?whatsappSettingsId=${waSettingsId}`,
    data,
  );
  return res.data as { questions: any[] };
};
export const syncAdAccounts = async (waSettingsId) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/ad-accounts/${waSettingsId}`,
  );
  return res.data as { id: string; name: string }[];
};
export const syncAdsByAdAccount = async (
  adAccountId: string,
  waSettingsId: string,
) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/ads/${adAccountId}?whatsappSettingsId=${waSettingsId}`,
  );
  return res.data as { id: string; name: string }[];
};
export const subscribeFieldtoPage = async (waSettingsId, body: fbPageQuery) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/subscribe/${waSettingsId}`,
    body,
  );
  return res.data;
};
export interface MetaAssets {
  waSettingsId: string;
  pages: {
    id: string;
    name: string;
    access_token: string;
    subscribedFields: string[];
    instagram_business_account: {
      id: string;
    };
    pageAccessTokenByUser?: string;
  }[];
  adAccounts: {
    id: string;
    name: string;
    ads: {
      id: string;
      name: string;
    }[];
  }[];
  leads: {
    created_time: string;
    id: string;
    ad_id: string;
    form_id: string;
    field_data: {
      name: string;
      values: any[];
    }[];
  }[];
  leadgenForms: {
    pageId: string;
    id: string;
    name: string;
    questions: any[];
  }[];
}
export const getMetaAssets = async (waSettingsId) => {
  return (await axiosClient.get(`${SettingsUrl}/meta-assets/${waSettingsId}`))
    .data as MetaAssets;
};
