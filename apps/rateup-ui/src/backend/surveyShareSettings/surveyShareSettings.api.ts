import type { QueryFunctionContext } from "@tanstack/react-query";

import type { RequestPayload } from "@/types/api.ts";

import { axiosClient } from "../apiClient";

type ShareSettingsResource = { resourceName?: string; id?: string };
type ShareSettingsQueryKey = readonly [string, ShareSettingsResource];

const settingsApiUrl = "/shareSettings";

const getShareSettings = async ({ queryKey }: QueryFunctionContext<ShareSettingsQueryKey>) => {
  const [_key, { resourceName, id }] = queryKey;
  if (resourceName && id) {
    const url = `${settingsApiUrl}/${resourceName}/${id}`;
    const response = await axiosClient.get(url);
    const data = await response.data;
    return data;
  } else {
    return null;
  }
};

const upadateShareSettings = async (obj: {
  params: ShareSettingsResource;
  body: RequestPayload;
}) => {
  const {
    params: { resourceName, id },
    body,
  } = obj;

  if (resourceName && id && body) {
    const url = `${settingsApiUrl}/${resourceName}/${id}`;
    const response = await axiosClient.put(url, body, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    const data = await response.data;
    return data;
  } else {
    return null;
  }
};

export { getShareSettings, upadateShareSettings };
