import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { log } from "../../utils/logger";

const WA_API_VERSION = "v22.0";
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
    validateStatus: () => true, // don't throw error on non-2xx status
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
    if (res.data?.error) {
      throw new GraphApiError(res);
    } else {
      log.fatal("FIXME: Couldn't identify error response");
      throw new Error("Error calling WhatsApp API");
    }
  }
}

interface GraphApiErrorType {
  message: string;
  type: string;
  code: number;
  fbtrace_id: string;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
}

export class GraphApiError extends Error {
  error: GraphApiErrorType;
  constructor(res: AxiosResponse) {
    let message = "Something went wrong";
    super(message);
    this.name = "GraphApiError";
    this.error = res.data.error;
  }
}
