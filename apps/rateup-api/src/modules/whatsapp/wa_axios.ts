import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { log } from "../../utils/logger.js";

async function axiosWithRetry<T = any>(
  config: AxiosRequestConfig,
  retries = 3,
): Promise<AxiosResponse<T>> {
  let lastError: AxiosError | null = null;

  const retryableErrors = new Set([
    "ENETUNREACH",
    "ECONNABORTED",
    "ECONNRESET",
    "ETIMEDOUT",
    "EPROTO",
    "EAI_AGAIN",
  ]);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        ...config,
        validateStatus: () => true,
      });

      return response;
    } catch (error: any) {
      lastError = error;

      const isRetryable = retryableErrors.has(error.code);

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      log.warn(
        {
          code: error.code,
          attempt,
        },
        "WhatsApp API request failed. Retrying...",
      );
    }
  }

  throw lastError!;
}

const META_API_VERSION = "v25.0";

export async function callMetaApi(
  url: string,
  method: AxiosRequestConfig["method"],
  accessToken?: string,
  data?: AxiosRequestConfig["data"],
  otherConfig: AxiosRequestConfig = {},
  headerConfig: AxiosRequestConfig["headers"] = {},
  params: AxiosRequestConfig["params"] = {},
): Promise<AxiosResponse<any, any>> {
  const headAuth = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const config: AxiosRequestConfig = {
    url: `https://graph.facebook.com/${META_API_VERSION}${url}`,
    method,
    data,
    params,
    headers: {
      ...headAuth,
      ...headerConfig,
    },
    validateStatus: () => true, // don't throw error on non-2xx status
    ...otherConfig,
  };
  log.trace("Calling Meta API with config: %s %s \n%o", config.method, config.url, config.data);
  const res = await axiosWithRetry(config);
  if (res.status.toString().startsWith("2")) {
    return res;
  } else {
    log.error("Error calling Meta API: %o", res);
    log.error("\nError Response => %o", res.data);
    if (res.data?.error) {
      throw new GraphApiError(res);
    } else {
      log.fatal("FIXME: Couldn't identify error response");
      throw new Error("Error calling Meta API");
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
