import "@shopify/shopify-api/adapters/node";
import {
  ApiVersion,
  LogSeverity,
  Session,
  SessionParams,
  shopifyApi,
} from "@shopify/shopify-api";
import { getShopifyAuthUrl, getShopifySession } from "./shopify.service";
import webhookHandlers from "./shopify.handler";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-04";

const apiUrl = new URL(process.env.API_URL);

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,
  scopes: process.env.SHOPIFY_SCOPES.split(","),
  hostName: apiUrl.hostname,
  hostScheme: "https",
  apiVersion: ApiVersion.April24,
  restResources,
  isEmbeddedApp: false,
  future: {
    customerAddressDefaultFix: true,
    lineItemBilling: true,
  },
  logger: {
    level: LogSeverity.Debug,
    timestamps: true,
    httpRequests: true,
  },
});

shopify.webhooks.addHandlers(webhookHandlers);

export default shopify;
