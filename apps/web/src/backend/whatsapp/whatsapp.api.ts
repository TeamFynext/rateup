import type { RequestPayload } from "@/types/api.ts";
import type { TemplateType, WaTemplateCategory, WaTemplateStatus } from "@/types/enums.ts";
import type { WaTemplateFetchBody, WaTemplateFetchBodyComponent } from "@/types/global";
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
    components: Array<WaTemplateFetchBodyComponent>;
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

/** What a sync pass did, as the server reports it back. */
export interface SyncTemplatesResult {
  success: boolean;
  created: number;
  updated: number;
  /** Templates Meta no longer has: these were put back into draft. */
  revertedToDraft: number;
  message?: string;
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
/** A saved template row, as the templates list returns it. */
export interface WaTemplateListEntry {
  id: string;
  createdAt: string;
  templateType?: string;
  whatsappSettingsPhoneId?: string | null;
  WhatsappSettings?: { phoneDisplayName?: string | null };
  _count?: { Campaign?: number };
  data: WaTemplateFetchBody;
}

export const getWaTemplates = async (templatType?: string) => {
  const url = templatType ? `${TEMPLATES_URL}?templateType=${templatType}` : TEMPLATES_URL;
  const res = await axiosClient.get(url);
  return res.data as WaTemplateListEntry[];
};

export const getWaTemplateById = async (id: string) => {
  const res = await axiosClient.get(`${TEMPLATES_URL}/${id}`);
  return res.data;
};

export const createWaTemplate = async (templateData: RequestPayload) => {
  return axiosClient.post(`${TEMPLATES_URL}`, templateData, {
    timeout: 25000,
  });
};
export const saveTemplateAsDraft = async (templateData: RequestPayload) => {
  return axiosClient.post(`${TEMPLATES_URL}/save-as-draft`, templateData);
};
export const deleteWaTemplate = async (id: string) => {
  return axiosClient.delete(`${TEMPLATES_URL}/${id}`);
};
export const updateWaTemplate = async (id: string, templateData: RequestPayload) => {
  return axiosClient.put(`${TEMPLATES_URL}/${id}`, templateData);
};
export const syncTemplates = async (input?: SyncTemplatesInput) => {
  const res = await axiosClient.post(`${TEMPLATES_URL}/sync`, input);
  return res.data as SyncTemplatesResult;
};
export const getUnregisteredTemplates = async () => {
  return (await axiosClient.get(`${TEMPLATES_URL}/unregistered`)).data;
};
export const registerTemplates = async (
  dbTemplates: Array<{ data: WaTemplateFetchBody; acceptButton: string }>,
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
  parameterData: RequestPayload,
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

// ---------------------------------------------------------------------------
// Meta's template library
// ---------------------------------------------------------------------------

/** A ready-written template from Meta's library (UTILITY or AUTHENTICATION only). */
export interface LibraryTemplate {
  name: string;
  language: string;
  category: string;
  topic: string | null;
  usecase: string | null;
  industry: string[];
  /** True only when Meta approves it unchanged without review. Read per entry. */
  pre_approved: boolean;
  header: string | null;
  header_type: string | null;
  body: string;
  body_params: string[];
  footer: string | null;
  buttons: { type: string; text?: string; url?: string; phone_number?: string }[];
  required_inputs: {
    buttons: { index: number; type: string; text?: string; needs: "url" | "phone_number" }[];
    body_inputs: { param_name: string }[];
  };
}

export interface LibraryPage {
  data: LibraryTemplate[];
  after: string | null;
}

export interface TemplateLibraryQuery {
  whatsappSettingsPhoneId?: string;
  search?: string;
  language?: string;
  category?: string;
  topic?: string;
}

export const getTemplateLibrary = async (query: TemplateLibraryQuery, after?: string) => {
  const res = await axiosClient.get(`${TEMPLATES_URL}/library`, {
    params: {
      ...Object.fromEntries(Object.entries(query).filter(([, value]) => Boolean(value))),
      ...(after ? { after } : {}),
    },
  });
  return res.data as LibraryPage;
};

export interface CreateFromLibraryInput {
  whatsappSettingsPhoneId: string;
  name: string;
  libraryTemplateName: string;
  language: string;
  category?: string;
  templateType?: TemplateType;
  buttons?: {
    index: number;
    type: string;
    url?: string;
    urlSuffixExample?: string;
    phoneNumber?: string;
  }[];
  bodyInputs?: Record<string, string>;
}

/** Creates the template on Meta and stores it; answers with the stored row. */
export const createTemplateFromLibrary = async (input: CreateFromLibraryInput) => {
  try {
    const res = await axiosClient.post(`${TEMPLATES_URL}/library`, input);
    return res.data as { id: string };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Couldn't create the template"));
  }
};
