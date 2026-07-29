import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { log } from "../../utils/logger.js";

import { META_AGENT_API_HOST, META_AGENT_API_VERSION } from "../../utils/meta.js";

export class MetaAgentApiError extends Error {
  status: number;
  detail?: string;
  type?: string;
  constructor(res: AxiosResponse) {
    const body = res.data ?? {};
    super(body.detail || body.title || "Meta Business Agent API request failed");
    this.name = "MetaAgentApiError";
    this.status = res.status;
    this.detail = body.detail;
    this.type = body.type;
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
  log.error("Meta Business Agent API error %o", res.data);
  throw new MetaAgentApiError(res);
}
