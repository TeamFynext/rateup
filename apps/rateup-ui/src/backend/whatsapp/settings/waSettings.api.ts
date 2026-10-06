import type { RequestPayload } from "@/types/api.ts";
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
  // Messenger/Instagram are no longer on a WhatsApp channel: see MetaChannel
  // (`@/backend/meta/metaChannels.api`).
  phoneDisplayName: string;
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
    /** Signed Meta CDN URL — expires, so it can be stale until the next page sync. */
    pictureUrl?: string;
    instagram_business_account: {
      id: string;
      username?: string;
      /** Same caveat as `pictureUrl`. */
      profile_picture_url?: string;
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

/**
 * A number's display name as Meta sees it. `verifiedName`/`nameStatus` describe the name in
 * use; a change still under review shows up as `newDisplayName`/`newNameStatus`.
 */
export interface DisplayNameStatus {
  verifiedName: string | null;
  nameStatus: string | null;
  newDisplayName: string | null;
  newNameStatus: string | null;
}

export const syncDisplayName = async (phoneId: string) => {
  const res = await axiosClient.post(`${SettingsUrl}/display-name/${phoneId}/sync`);
  return res.data as DisplayNameStatus;
};

export const updateDisplayName = async ({
  phoneId,
  newDisplayName,
}: {
  phoneId: string;
  newDisplayName: string;
}) => {
  const res = await axiosClient.post(`${SettingsUrl}/display-name/${phoneId}`, { newDisplayName });
  return res.data as DisplayNameStatus;
};

export const reRegisterPhoneNumber = async (phoneId: string) => {
  const res = await axiosClient.post(`${SettingsUrl}/display-name/${phoneId}/register`);
  return res.data as { success?: boolean };
};

/** Meta's `WhatsAppVertical` values that the profile API accepts on write. */
export const BUSINESS_VERTICALS = [
  "OTHER",
  "AUTO",
  "BEAUTY",
  "APPAREL",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GROCERY",
  "GOVT",
  "HOTEL",
  "HEALTH",
  "NONPROFIT",
  "PROF_SERVICES",
  "RETAIL",
  "TRAVEL",
  "RESTAURANT",
] as const;

export type BusinessVertical = (typeof BUSINESS_VERTICALS)[number];

/** The profile customers see when they open the business in WhatsApp. */
export interface BusinessProfile {
  about: string | null;
  address: string | null;
  description: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  websites: string[];
  vertical: string | null;
}

export interface BusinessProfileInput {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: BusinessVertical;
}

export const getBusinessProfile = async (phoneId: string) => {
  const res = await axiosClient.get(`${SettingsUrl}/profile/${phoneId}`);
  return res.data as BusinessProfile;
};

export const updateBusinessProfile = async ({
  phoneId,
  data,
}: {
  phoneId: string;
  data: BusinessProfileInput;
}) => {
  const res = await axiosClient.post(`${SettingsUrl}/profile/${phoneId}`, data);
  return res.data;
};

export const updateProfilePicture = async ({ phoneId, file }: { phoneId: string; file: File }) => {
  const body = new FormData();
  // `size` goes ahead of the file: the API's upload validation reads it off the preceding
  // multipart fields. `timeout: 0` so a slow upload is not cut off by the client default.
  body.append("size", file.size.toString());
  body.append("file", file);
  const res = await axiosClient.post(`${SettingsUrl}/profile/${phoneId}/photo`, body, {
    timeout: 0,
  });
  return res.data;
};
