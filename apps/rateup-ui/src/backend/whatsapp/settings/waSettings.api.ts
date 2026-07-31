import type { ColumnFilterState, RequestPayload } from "@/types/api.ts";
import type { MetaLoginAssets, WaConfigType, WhatsappSettingsStatus } from "@/types/enums.ts";

/** A question on a Meta leadgen form, as the Graph API returns it. */
export interface LeadgenFormQuestion {
  key: string;
  label?: string;
  type?: string;
  id?: string;
}

import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

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
  fbUserName: string;
  ibaId: string;
  pageAccessToken: string;
  igUserName: string;
  phoneDisplayName: string;
  igDisplayName: string;
  assets: MetaLoginAssets[];
  conversionsApiDatasetId?: string;
  conversionData?: { event_name?: string; currency?: string };
  paymentMethod?: string;
  status?: WhatsappSettingsStatus;
}[];

export type UpdateWaSettingsInput = Partial<Omit<WaSettings[0], "teams"> & { teams: string[] }>;

export const getWaSettings = async () => {
  const res = await axiosClient.get(SettingsUrl);
  return res.data as WaSettings;
};

export const upsertWaSettings = async (settings: RequestPayload) => {
  const res = await axiosClient.put(SettingsUrl, settings);
  return res;
};

export const updateWaSettingsById = async (settingId: string, data: RequestPayload) => {
  const res = await axiosClient.put(`${SettingsUrl}/${settingId}`, data);
  return res;
};

export const createWaSettings = async (settings: RequestPayload) => {
  const res = await axiosClient.post(SettingsUrl, settings);
  return res.data;
};
export const deleteWaSettings = async (phoneId: string) => {
  const res = await axiosClient.delete(`${SettingsUrl}/${phoneId}`);
  return res.data;
};

export const registerBusinessClient = async ({
  code,
  phone_number_id,
  waba_id,
  assets,
}: {
  code: string;
  phone_number_id: string;
  waba_id: string;
  assets: string[];
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

export const updateUserAccessToken = async ({
  waSettingId,
  code,
}: {
  waSettingId: string;
  code: string;
}) => {
  const res = axiosClient.post(`${authUrl}/user-token/${waSettingId}`, {
    code,
  });
  return res;
};

interface WaLogsRes {
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
}
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
  columnFilters: ColumnFilterState[],
) => {
  const filter = columnFilters.map((data) => `&${data.id}=${data.value}`).join("&");
  const desc = sort.desc ? "desc" : "asc";
  const url = `${SettingsUrl}/logs?page=${pagination.pageIndex}&limit=${pagination.pageSize}&search=${search}&desc=${desc}${filter}`;

  const res = await axiosClient.get(url);
  return res.data as WaLogsRes;
};

export const syncFbPages = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${SettingsUrl}/sync/pages/${waSettingsId}`);
  return res.data as { id: string; name: string; access_token: string }[];
};

export interface fbPageQuery {
  fbPageId: string;
  pageAccessToken: string;
  fields?: string[];
}

export const syncMetaLeadgenForms = async (waSettingsId: string, data: fbPageQuery) => {
  const res = await axiosClient.post(`${SettingsUrl}/sync/leadgen-forms/${waSettingsId}`, data);
  return res.data as { id: string; name: string }[];
};
export const syncLeadgenFormQuestions = async (
  formId: string | undefined,
  waSettingsId: string | null,
  data: fbPageQuery,
) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/leadgen-form/${formId}?whatsappSettingsId=${waSettingsId}`,
    data,
  );
  return res.data as { questions: LeadgenFormQuestion[] };
};
export const syncAdAccounts = async (waSettingsId: string) => {
  const res = await axiosClient.post(`${SettingsUrl}/sync/ad-accounts/${waSettingsId}`);
  return res.data as { id: string; name: string }[];
};
export const syncAdsByAdAccount = async (adAccountId: string, waSettingsId: string) => {
  const res = await axiosClient.post(
    `${SettingsUrl}/sync/ads/${adAccountId}?whatsappSettingsId=${waSettingsId}`,
  );
  return res.data as { id: string; name: string }[];
};
export const syncDatasets = async (waSettingsId: string) => {
  const res = await axiosClient.get(`${SettingsUrl}/sync/datasets/${waSettingsId}`);
  return res.data;
};

export const subscribeFieldtoPage = async (waSettingsId: string, body: fbPageQuery) => {
  const res = await axiosClient.post(`${SettingsUrl}/subscribe/${waSettingsId}`, body);
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
      values: string[];
    }[];
  }[];
  leadgenForms: {
    pageId: string;
    id: string;
    name: string;
    questions: LeadgenFormQuestion[];
  }[];
}
export const getMetaAssets = async (waSettingsId: string) => {
  return (await axiosClient.get(`${SettingsUrl}/meta-assets/${waSettingsId}`)).data as MetaAssets;
};
/** Meta's `business_verification_status`, or `null` when the WABA isn't connected yet. */
export interface VerificationStatusResponse {
  verificationStatus: string | null;
}

export const getVerificationStatus = async (): Promise<VerificationStatusResponse> => {
  return (await axiosClient.get(`${SettingsUrl}/verification-status`)).data;
};

export interface ConversationalAutomationCommand {
  command_name: string;
  command_description: string;
}

export interface ConversationalAutomation {
  commands: ConversationalAutomationCommand[];
  prompts: string[];
}

export const getConversationalAutomation = async (phoneId: string) => {
  const res = await axiosClient.get(`${SettingsUrl}/conversational-automation/${phoneId}`);
  return res.data as ConversationalAutomation;
};

export const updateConversationalAutomation = async ({
  phoneId,
  data,
}: {
  phoneId: string;
  data: Partial<ConversationalAutomation>;
}) => {
  const res = await axiosClient.post(`${SettingsUrl}/conversational-automation/${phoneId}`, data);
  return res.data;
};

export const syncConversationalAutomation = async (phoneId: string) => {
  const res = await axiosClient.post(`${SettingsUrl}/conversational-automation/${phoneId}/sync`);
  return res.data as ConversationalAutomation;
};
