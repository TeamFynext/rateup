import axios from "axios";
import { formatZohoDateTime } from "./zoho.utils.js";

export type ZohoProduct = "crm" | "bigin";

function getZohoApiPath(product: ZohoProduct = "crm") {
  switch (product) {
    case "crm":
      return "/crm/v8";
    case "bigin":
      return "/bigin/v2";
    default:
      throw new Error(`Unsupported Zoho product: ${product}`);
  }
}

export function createZohoAxios(
  accessToken: string,
  baseUrl = "https://www.zohoapis.in",
) {
  return axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

function getZohoRecordModulePath(
  moduleName: string,
  product: ZohoProduct = "crm",
) {
  return `${getZohoApiPath(product)}/${moduleName}`;
}

export async function createZohoRecord(
  accessToken: string,
  moduleName: string,
  data: Record<string, any>,
  baseUrl?: string,
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.post(
    getZohoRecordModulePath(moduleName, product),
    {
      data: [data],
    },
  );
  return response.data;
}

export async function updateZohoRecord(
  accessToken: string,
  moduleName: string,
  recordId: string,
  data: Record<string, any>,
  baseUrl?: string,
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.put(
    `${getZohoRecordModulePath(moduleName, product)}/${recordId}`,
    {
      data: [data],
    },
  );
  return response.data;
}

export async function getZohoRecords(
  accessToken: string,
  moduleName: string,
  baseUrl?: string,
  params?: Record<string, any>,
  modifiedSince?: string,
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.get(
    getZohoRecordModulePath(moduleName, product),
    {
      params: {
        per_page: 200,
        ...params,
      },
      headers: modifiedSince
        ? {
            "If-Modified-Since": modifiedSince,
          }
        : undefined,
    },
  );
  return response.data;
}

export async function deleteZohoRecord(
  accessToken: string,
  moduleName: string,
  recordId: string,
  baseUrl?: string,
  product: ZohoProduct = "crm",
) {
  const client = createZohoAxios(accessToken, baseUrl);
  const response = await client.delete(
    `${getZohoRecordModulePath(moduleName, product)}/${recordId}`,
  );
  return response.data;
}

export async function getZohoModuleMetadata(
  accessToken: string,
  moduleName: string,
  baseUrl?: string,
  product: ZohoProduct = "bigin",
) {
  const client = createZohoAxios(accessToken, baseUrl);

  const response = await client.get(
    `${getZohoApiPath(product)}/settings/modules/${moduleName}`,
  );

  return response.data;
}

export async function getZohoFieldMetadata(
  accessToken: string,
  moduleName: string,
  baseUrl?: string,
  product: ZohoProduct = "bigin",
) {
  const client = createZohoAxios(accessToken, baseUrl);

  const response = await client.get(
    `${getZohoApiPath(product)}/settings/fields`,
    {
      params: {
        module: moduleName,
      },
    },
  );

  return response.data;
}

export async function getZohoLayoutsMetadata(
  accessToken: string,
  moduleName: string,
  baseUrl?: string,
  product: ZohoProduct = "bigin",
) {
  const client = createZohoAxios(accessToken, baseUrl);

  const response = await client.get(
    `${getZohoApiPath(product)}/settings/layouts`,
    {
      params: {
        module: moduleName,
      },
    },
  );

  return response.data;
}

export async function getZohoRecordById(
  accessToken: string,
  module: string,
  recordId: string,
  apiDomain: string,
  product: "crm" | "bigin",
) {
  const client = createZohoAxios(accessToken, apiDomain);

  let url = "";
  if (product === "crm") {
    url = `/crm/v8/${module}/${recordId}`;
  }
  if (product === "bigin") {
    url = `/bigin/v1/${module}/${recordId}`;
  }
  const response = await client.get(url);
  return response.data;
}

export async function registerZohoWebhook({
  accessToken,
  apiDomain,
  product,
  events,
  zohoWebhookSecret,
}: {
  accessToken: string;
  apiDomain: string;
  product: "crm" | "bigin";
  events: string[];
  zohoWebhookSecret: string;
}) {
  const client = createZohoAxios(accessToken, apiDomain);
  const apiPath = getZohoApiPath(product);
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const channelId = Date.now().toString();
  await client.post(`${apiPath}/actions/watch`, {
    watch: [
      {
        channel_id: channelId,
        events,
        notify_url: `${process.env.API_URL}/api/integration/external/zoho/webhooks/${product}`,
        channel_expiry: formatZohoDateTime(expiryDate),
        token: zohoWebhookSecret,
        operation: "subscribe",
      },
    ],
  });
  return {
    channelId,
  };
}

export async function unsubscribeZohoWebhook({
  accessToken,
  apiDomain,
  product,
  channelIds,
}: {
  accessToken: string;
  apiDomain: string;
  product: "crm" | "bigin";
  channelIds: string[];
}) {
  const client = createZohoAxios(accessToken, apiDomain);
  const apiUrl =
    product === "crm" ? "/crm/v8/actions/watch" : "/bigin/v2/actions/watch";
  return client.delete(apiUrl, {
    params: {
      channel_ids: channelIds.join(","),
    },
  });
}
