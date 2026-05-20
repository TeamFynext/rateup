import { axiosClient } from "../apiClient";

const settingsApiUrl = "/shareSettings";

const getShareSettings = async ({ queryKey }) => {
  try {
    const [_key, { resourceName, id }] = queryKey;
    if (resourceName && id) {
      const url = `${settingsApiUrl}/${resourceName}/${id}`;
      const response = await axiosClient.get(url);
      const data = await response.data;
      return data;
    } else {
      return null;
    }
  } catch (err) {
    throw err;
  }
};

const upadateShareSettings = async (obj) => {
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
