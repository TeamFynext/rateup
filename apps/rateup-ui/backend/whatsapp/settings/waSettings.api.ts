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
};
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

export const registerBusinessClient = async (code) => {
  const res = axiosClient.post(`${authUrl}/register`, { code });
  return res;
};

export const deRegisterBusinessClient = async () => {
  const res = axiosClient.post(`${authUrl}/deregister`);
  return res;
};
