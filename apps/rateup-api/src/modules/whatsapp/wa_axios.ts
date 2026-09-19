import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { log } from "../../utils/logger.js";
import { graphUrl } from "../../utils/meta.js";

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
    } catch (error) {
      const axiosError = error as AxiosError;
      lastError = axiosError;

      const isRetryable = retryableErrors.has(axiosError.code ?? "");

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      log.warn(
        {
          code: axiosError.code,
          attempt,
        },
        "WhatsApp API request failed. Retrying...",
      );
    }
  }

  throw lastError!;
}

/** Re-exported so existing importers of wa_axios keep working. */
export { META_API_HOST, META_API_VERSION } from "../../utils/meta.js";

export async function callMetaApi(
  url: string,
  method: AxiosRequestConfig["method"],
  // `null` is a legitimate, intentional value here (as opposed to just
  // omitting the argument): some callers embed the access token in the
  // request body instead of the Authorization header (e.g. Meta's catalog
  // items_batch endpoint) and explicitly pass `null` to make that clear.
  accessToken?: string | null,
  data?: AxiosRequestConfig["data"],
  otherConfig: AxiosRequestConfig = {},
  headerConfig: AxiosRequestConfig["headers"] = {},
  params: AxiosRequestConfig["params"] = {},
): Promise<AxiosResponse<any, any>> {
  const headAuth = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const config: AxiosRequestConfig = {
    url: graphUrl(url),
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
    // Callers log the thrown error with their own context; this line only adds
    // what they can't see. Never log `res` itself — its config carries the token.
    log.warn(
      { status: res.status, method: config.method, url: config.url, graphError: res.data?.error },
      "Meta API returned an error",
    );
    if (res.data?.error) {
      throw new GraphApiError(res);
    } else {
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
