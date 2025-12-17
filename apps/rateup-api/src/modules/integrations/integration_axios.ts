import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { log } from "../../utils/logger.js";

export async function callWaAmeliaApi(
  url: string,
  method: AxiosRequestConfig["method"],
  accessToken?: string,
  headerConfig: AxiosRequestConfig["headers"] = {},
  data?: AxiosRequestConfig["data"],
  otherConfig: AxiosRequestConfig = {},
): Promise<AxiosResponse<any, any>> {
  const headAuth = accessToken ? { Amelia: accessToken } : {};
  const config: AxiosRequestConfig = {
    url: url,
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
    "Calling amelia API with config: %s %s \n%o",
    config.method,
    config.url,
    config.data,
  );
  const res = await axios(config);
  return res?.data;
}
