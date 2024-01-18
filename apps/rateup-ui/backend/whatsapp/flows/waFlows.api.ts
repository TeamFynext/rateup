import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const flowsUrl = `${WHATSAPP_URL}/flows`;

export const getWaFlows = async () => {
  const res = await axiosClient.get(flowsUrl);
  return res.data;
};
