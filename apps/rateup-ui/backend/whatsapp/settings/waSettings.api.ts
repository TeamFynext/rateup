import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const SettingsUrl = `${WHATSAPP_URL}/settings`;
const authUrl = `${WHATSAPP_URL}/auth`;

type WaSettings = {
  wabaId: string;
  phone: string;
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
  const res = axiosClient.post(SettingsUrl, settings);
  return res;
};

export const registerBusinessClient = async (code) => {
  const res = axiosClient.post(`${authUrl}/register`, { code });
  return res;
};

export const deRegisterBusinessClient = async () => {
  const res = axiosClient.post(`${authUrl}/deregister`);
  return res;
};
