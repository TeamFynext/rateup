import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { log } from "../../utils/logger.js";

import { META_AGENT_API_HOST, META_AGENT_API_VERSION } from "../../utils/meta.js";

export class MetaAgentApiError extends Error {
  status: number;
  title?: string;
  detail?: string;
  type?: string;
  /**
   * Meta's id for the failed request — what support asks for. It is in the
   * error body, and in the X-FB-Request-ID header even when there is no body.
   */
  fbtraceId?: string;
  constructor(res: AxiosResponse) {
    const body = res.data ?? {};
    super(body.detail || body.title || "Meta Business Agent API request failed");
    this.name = "MetaAgentApiError";
    this.status = res.status;
    this.title = body.title;
    this.detail = body.detail;
    this.type = body.type;
    this.fbtraceId = body.fbtrace_id ?? res.headers?.["x-fb-request-id"];
  }
}

export async function callMetaAgentApi<T = any>(
  path: string,
  method: AxiosRequestConfig["method"],
  accessToken: string,
  data?: AxiosRequestConfig["data"],
  params: AxiosRequestConfig["params"] = {},
  extraHeaders: AxiosRequestConfig["headers"] = {},
): Promise<T> {
  const config: AxiosRequestConfig = {
    url: `${META_AGENT_API_HOST}${path}`,
    method,
    data,
    params,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-API-Version": META_AGENT_API_VERSION,
      ...extraHeaders,
    },
    validateStatus: () => true,
  };
  log.trace("Calling Meta Business Agent API: %s %s", config.method, config.url);
  const res = await axios(config);
  if (res.status.toString().startsWith("2")) {
    return res.data;
  }
  const error = new MetaAgentApiError(res);
  log.error(
    "Meta Business Agent API error %s (fbtrace_id %s) %o",
    res.status,
    error.fbtraceId,
    res.data,
  );
  throw error;
}
