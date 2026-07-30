import type { TemplateType, WaTemplateCategory, WaTemplateStatus } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { WHATSAPP_URL } from ".";
import { axiosClient } from "../apiClient";

const TEMPLATES_URL = `${WHATSAPP_URL}/templates`;
const REDIRECT_URL = `${WHATSAPP_URL}/redirect`;

export interface WaTemplate {
  id: string;
  createdAt: Date;
  whatsappSettingsPhoneId?: string;
  defaultValues?: {
    whatsappSettingsPhoneId?: string;
  };
  data: {
    name: string;
    components: Array<any>;
    id: string;
    status: WaTemplateStatus;
    language: string;
    category: WaTemplateCategory;
  };
  acceptButton: string;
  orgId: string;
  templateType?: TemplateType;
}

export interface SyncTemplatesInput {
  whatsappSettingsPhoneIds?: string[];
}

/**
 * A draft template payload as the template-creation screens assemble it before
 * sending it to the save-as-draft endpoint.
 */
export interface WaTemplateDraftPayload {
  name: string;
  header: string | null;
  language: string;
  body: string;
  footer: string;
  category: string;
  format: string;
  buttons: unknown[];
  status: string;
  example: string[];
  templateType: string;
  mediaCarousel: unknown[];
  productCarousel: unknown[];
  whatsappSettingsPhoneId: string;
  defaultValues: {
    catalog: {
      thumbnail_product_retailer_id: string;
      mpm: { sections: unknown[] };
      spm: { product_retailer_id: string };
      catalogId: string;
    };
    whatsappSettingsPhoneId: string;
  };
}

/**
 * Fetches whatsapp templates using orgId user belongs to.
 */
export const getWaTemplates = async (templatType?: string) => {
  const url = templatType ? `${TEMPLATES_URL}?templateType=${templatType}` : TEMPLATES_URL;
  const res = await axiosClient.get(url);
  return res.data as WaTemplate[];
};

export const getWaTemplateById = async (id: string) => {
  const res = await axiosClient.get(`${TEMPLATES_URL}/${id}`);
  return res.data;
};

export const createWaTemplate = async (templateData: any) => {
  return axiosClient.post(`${TEMPLATES_URL}`, templateData, {
    timeout: 25000,
  });
};
export const saveTemplateAsDraft = async (templateData: any) => {
  return axiosClient.post(`${TEMPLATES_URL}/save-as-draft`, templateData);
};
export const deleteWaTemplate = async (id: string) => {
  return axiosClient.delete(`${TEMPLATES_URL}/${id}`);
};
export const updateWaTemplate = async (id: string, templateData: any) => {
  return axiosClient.put(`${TEMPLATES_URL}/${id}`, templateData);
};
export const syncTemplates = async (input: SyncTemplatesInput) => {
  return axiosClient.post(`${TEMPLATES_URL}/sync`, input);
};
export const getUnregisteredTemplates = async () => {
  return (await axiosClient.get(`${TEMPLATES_URL}/unregistered`)).data;
};
export const registerTemplates = async (
  dbTemplates: Array<{ data: any; acceptButton: string }>,
) => {
  return axiosClient.post(`${TEMPLATES_URL}/register`, dbTemplates);
};
export async function _tokenizeIp() {
  return (await axiosClient.post(`${REDIRECT_URL}`)).data;
}

interface imageResponse {
  id: string;
  uploadSessionId: string;
}
export async function uploadTemplateMedia(file: File) {
  const formData = new FormData();
  formData.append("size", file.size?.toString());
  formData.append("file", file);
  try {
    const response = await axiosClient.post(`${TEMPLATES_URL}/upload`, formData, {
      timeout: 0,
    });
    return response?.data as imageResponse;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export async function sendWaTemplateToUser(
  templateId: string,
  phone: string,
  parameterData: any,
  teamId: string,
  whatsappSettingsPhoneId: string,
) {
  return axiosClient.post(`${TEMPLATES_URL}/${templateId}/send`, {
    templateId,
    phone,
    parameterData,
    teamId,
    whatsappSettingsPhoneId,
  });
}

export async function getShareUrlFromSurveyTeamMapId(surveyTeamMapShortId: string) {
  const res = await axiosClient.get(`${REDIRECT_URL}/${surveyTeamMapShortId}`);
  return res.data;
}
