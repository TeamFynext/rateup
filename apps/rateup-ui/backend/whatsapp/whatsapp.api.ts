import { WHATSAPP_URL } from ".";
import {
  TemplateType,
  WaTemplateCategory,
  WaTemplateStatus,
} from "../../types/enums";
import { axiosClient } from "../apiClient";

const TEMPLATES_URL = `${WHATSAPP_URL}/templates`;
const REDIRECT_URL = `${WHATSAPP_URL}/redirect`;

export type WaTemplate = {
  id: string;
  createdAt: Date;
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
};

/**
 * Fetches whatsapp templates using orgId user belongs to.
 */
export const getWaTemplates = async (templatType) => {
  const url = templatType
    ? `${TEMPLATES_URL}?templateType=${templatType}`
    : TEMPLATES_URL;
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
export const syncTemplates = async () => {
  return axiosClient.get(`${TEMPLATES_URL}/sync`);
};
export const getUnregisteredTemplates = async () => {
  return (await axiosClient.get(`${TEMPLATES_URL}/unregistered`)).data;
};
export const registerTemplates = async (
  dbTemplates: Array<{ data: any; acceptButton: string }>,
) => {
  return axiosClient.post(`${TEMPLATES_URL}/register`, dbTemplates);
};
export async function tokenizeIp() {
  return (await axiosClient.post(`${REDIRECT_URL}`)).data;
}

type imageResponse = {
  id: string;
  uploadSessionId: string;
};
export async function uploadTemplateMedia(file: File) {
  const formData = new FormData();
  formData.append("size", file.size?.toString());
  formData.append("file", file);
  try {
    const response = await axiosClient.post(
      `${TEMPLATES_URL}/upload`,
      formData,
      {
        timeout: 25000,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response?.data as imageResponse;
  } catch (error) {
    throw Error(error?.response?.data);
  }
}

export async function sendWaTemplateToUser(
  templateId: string,
  phone: string,
  parameterData: any,
  teamId: string,
) {
  return axiosClient.post(`${TEMPLATES_URL}/${templateId}/send`, {
    templateId,
    phone,
    parameterData,
    teamId,
  });
}

export async function getShareUrlFromSurveyTeamMapId(
  surveyTeamMapShortId: string,
) {
  const res = await axiosClient.get(`${REDIRECT_URL}/${surveyTeamMapShortId}`);
  return res.data;
}
