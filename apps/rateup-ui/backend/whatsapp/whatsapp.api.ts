import { WHATSAPP_URL } from ".";
import { axiosClient } from "../apiClient"

const TEMPLATES_URL = `${WHATSAPP_URL}/templates`
/**
 * Fetches whatsapp templates using orgId user belongs to.
 */
export const getWaTemplates = async () => {
  const res = await axiosClient.get(TEMPLATES_URL);
  return res.data;
}

export const createWaTemplate = async (templateData: any) => {
  return axiosClient.post(`${TEMPLATES_URL}`, templateData);
}
export const deleteWaTemplate = async (id: string) => {
  return axiosClient.delete(`${TEMPLATES_URL}/${id}`)
}
export const updateWaTemplate = async (id: string, templateData: any) => {
  return axiosClient.put(`${TEMPLATES_URL}/${id}`, templateData)
}
export const syncTemplates = async () => {
  return axiosClient.get(`${TEMPLATES_URL}/sync`)
}