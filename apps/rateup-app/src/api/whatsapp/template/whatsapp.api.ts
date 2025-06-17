import axios from "@/src/config/axios";
import { WaSettings, WaTemplate } from "../types";

const TEMPLATES_URL = `/api/wa/templates`;

export const getWaTemplates = async (templatType:any) => {
  const url = templatType
    ? `${TEMPLATES_URL}?templateType=${templatType}`
    : TEMPLATES_URL;
  const res = await axios.get(url);
  return res.data as WaTemplate[];
};

export async function sendWaTemplateToUser(
  templateId: string,
  phone: string,
  parameterData: any,
  teamId: string,
  whatsappSettingsPhoneId: string,
) {
  return axios.post(`${TEMPLATES_URL}/${templateId}/send`, {
    templateId,
    phone,
    parameterData,
    teamId,
    whatsappSettingsPhoneId,
  });
}
const SettingsUrl = `/api/wa/settings`;

export const getWaSettings = async () => {
  const res = await axios.get(SettingsUrl);
  return res.data as WaSettings;
};