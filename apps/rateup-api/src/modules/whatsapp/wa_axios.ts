import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { log } from "../../utils/logger";

const WA_API_VERSION = "v19.0";
export async function callWhatsappApi(
  url: string,
  method: AxiosRequestConfig["method"],
  accessToken?: string,
  data?: AxiosRequestConfig["data"],
  otherConfig: AxiosRequestConfig = {},
  headerConfig: AxiosRequestConfig["headers"] = {},
): Promise<AxiosResponse<any, any>> {
  const headAuth = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  const config: AxiosRequestConfig = {
    url: `https://graph.facebook.com/${WA_API_VERSION}${url}`,
    method,
    data,
    headers: {
      ...headAuth,
      ...headerConfig,
    },
    ...otherConfig,
  };
  log.trace("Calling WhatsApp API with config: %o", config);
  return await axios(config);
}
