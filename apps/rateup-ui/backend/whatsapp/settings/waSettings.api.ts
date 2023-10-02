import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const SettingsUrl = `${WHATSAPP_URL}/settings`;

export const getWaSettings = async () => {
  const res = await axiosClient.get(SettingsUrl);
  return res.data;
}

export const upsertWaSettings = async (settings) => {
  const res = await axiosClient.put(SettingsUrl, settings);
  return res
}

export const createWaSettings = async (settings) => {
  const res = axiosClient.post(SettingsUrl, settings);
  return res
}
