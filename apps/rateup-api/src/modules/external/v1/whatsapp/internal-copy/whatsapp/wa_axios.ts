import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { log } from "../../../../../../utils/logger.js";

const WA_API_VERSION = "v25.0";
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
    validateStatus: () => true,
    ...otherConfig,
  };
  log.trace(
    "Calling WhatsApp API with config: %s %s \n%o",
    config.method,
    config.url,
    config.data,
  );
  const res = await axios(config);
  if (res.status.toString().startsWith("2")) {
    return res;
  } else {
    log.error("Error calling WhatsApp API: %o", res);
    log.error("\nError Response => %o", res.data);
    if (res.data?.error?.error_user_msg)
      throw new Error(
        `Error calling WhatsApp API: ${res.status} error_message:${res.data?.error?.error_user_msg}`,
      );
    else if (res.data?.error?.message)
      throw new Error(
        `Error calling WhatsApp API: ${res.status} error_message:${res.data?.error?.message}`,
      );
    else
      throw new Error(
        `Error calling WhatsApp API: ${res.status} error_message:${res.data?.error?.error_data?.details}`,
      );
  }
}
