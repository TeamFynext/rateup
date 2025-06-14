import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { log } from "../../utils/logger";

async function axiosWithRetry<T = any>(
  config: AxiosRequestConfig,
  retries = 3,
): Promise<AxiosResponse<T>> {
  let lastError: AxiosError | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        ...config,
        validateStatus: () => true, // prevent throwing on non-2xx
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const isNetworkError =
        error.code === "ENETUNREACH" ||
        error.code === "ECONNABORTED" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (!isNetworkError || attempt === retries) {
        throw error;
      }

      log.warn(
        `Retry attempt ${attempt} failed with ${error.code}. Retrying...`,
      );
    }
  }

  throw lastError!;
}

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
    timeout: 15000,
    validateStatus: () => true, // don't throw error on non-2xx status
    ...otherConfig,
  };
  log.trace(
    "Calling WhatsApp API with config: %s %s \n%o",
    config.method,
    config.url,
    config.data,
  );
  const res = await axiosWithRetry(config);
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
